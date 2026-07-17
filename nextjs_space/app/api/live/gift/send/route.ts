import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { isExcludedFromFinance } from '@/lib/admin-check'
import { createNotificationWithPush } from '@/lib/notify'
import { processAgencyCommission, getPlatformSetting } from '@/lib/agency-commission'
import { calculateGiftDistribution, logRoomRevenue } from '@/lib/voice-room-revenue'
import { emitStreamEvent } from '@/lib/stream-events'
import { emitChatEvent } from '@/lib/chat-events'

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
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { roomId, roomType, giftTypeId, recipientId: bodyRecipientId } = body
    const quantity = Math.max(1, Math.min(100, parseInt(body.quantity) || 1))

    if (!roomId || !roomType || !giftTypeId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_PARAMS', message: 'roomId, roomType ve giftTypeId gereklidir' } },
        { status: 400 }
      )
    }

    // Get gift type
    const giftType = await prisma.giftType.findUnique({ where: { id: giftTypeId } })
    if (!giftType || !giftType.isActive) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_GIFT', message: 'Geçersiz hediye türü' } },
        { status: 400 }
      )
    }

    const totalPrice = giftType.price * quantity

    // Get sender
    const sender = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, name: true, image: true, jetonBalance: true, role: true, username: true }
    })
    if (!sender) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı' } },
        { status: 404 }
      )
    }

    const isStaff = sender.role === 'yonetici'
    const senderExcluded = await isExcludedFromFinance(sender.id)

    // Check jeton balance (staff skip)
    if (!isStaff && (sender.jetonBalance ?? 0) < totalPrice) {
      return NextResponse.json(
        { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'Yetersiz jeton bakiyesi' } },
        { status: 400 }
      )
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
        return NextResponse.json(
          { success: false, error: { code: 'STREAM_NOT_FOUND', message: 'Aktif yayın bulunamadı' } },
          { status: 404 }
        )
      }

      if (stream.userId === authUser.id && !isStaff) {
        return NextResponse.json(
          { success: false, error: { code: 'SELF_GIFT', message: 'Kendinize hediye gönderemezsiniz' } },
          { status: 400 }
        )
      }

      const txOps: any[] = [
        prisma.streamGift.create({
          data: {
            streamId: stream.id,
            senderId: sender.id,
            giftTypeId,
            quantity,
            totalPrice: senderExcluded ? 0 : totalPrice
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
        const commissionStr = await getPlatformSetting('stream_gift_commission', '30')
        const commissionPercent = Math.min(100, Math.max(0, parseInt(commissionStr) || 30))
        const recipientAmount = Math.floor(totalPrice * (100 - commissionPercent) / 100)
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

      // PK score update
      try {
        const activePK = await prisma.pKBattle.findFirst({
          where: {
            OR: [{ stream1Id: stream.id }, { stream2Id: stream.id }],
            status: 'active'
          }
        })
        if (activePK) {
          const isStream1 = activePK.stream1Id === stream.id
          const updated = await prisma.pKBattle.update({
            where: { id: activePK.id },
            data: isStream1 ? { score1: { increment: totalPrice } } : { score2: { increment: totalPrice } }
          })
          pkUpdate = { battleId: activePK.id, score1: updated.score1, score2: updated.score2 }
        }
      } catch { /* PK score not critical */ }

      // Emit SSE
      emitStreamEvent(stream.id, 'gift', {
        type: 'gift',
        streamId: stream.id,
        gift: {
          id: gift.id,
          senderName: sender.name,
          senderImage: sender.image,
          giftName: giftType.name,
          giftIcon: giftType.icon,
          quantity,
          totalPrice: senderExcluded ? 0 : totalPrice,
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
        return NextResponse.json(
          { success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı' } },
          { status: 404 }
        )
      }

      let recipientId = bodyRecipientId || room.ownerId
      if (!recipientId) {
        return NextResponse.json(
          { success: false, error: { code: 'NO_RECIPIENT', message: 'Alıcı bulunamadı' } },
          { status: 400 }
        )
      }

      if (recipientId === sender.id && !isStaff) {
        return NextResponse.json(
          { success: false, error: { code: 'SELF_GIFT', message: 'Kendinize hediye gönderemezsiniz' } },
          { status: 400 }
        )
      }

      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, name: true, jetonBalance: true }
      })
      if (!recipient) {
        return NextResponse.json(
          { success: false, error: { code: 'RECIPIENT_NOT_FOUND', message: 'Alıcı bulunamadı' } },
          { status: 404 }
        )
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

      // PK score update for voice room PK
      try {
        const activePK = await prisma.pKBattle.findFirst({
          where: {
            OR: [{ stream1Id: room.id }, { stream2Id: room.id }],
            status: 'active'
          }
        })
        if (activePK) {
          const isRoom1 = activePK.stream1Id === room.id
          const updated = await prisma.pKBattle.update({
            where: { id: activePK.id },
            data: isRoom1 ? { score1: { increment: totalPrice } } : { score2: { increment: totalPrice } }
          })
          pkUpdate = { battleId: activePK.id, score1: updated.score1, score2: updated.score2 }

          // Emit PK score event
          emitChatEvent(activePK.stream1Id, 'pk', { battleId: activePK.id, action: 'score_update', score1: updated.score1, score2: updated.score2, addedAmount: totalPrice, addedSide: isRoom1 ? 'room1' : 'room2' })
          emitChatEvent(activePK.stream2Id, 'pk', { battleId: activePK.id, action: 'score_update', score1: updated.score1, score2: updated.score2, addedAmount: totalPrice, addedSide: isRoom1 ? 'room1' : 'room2' })
        }
      } catch { /* PK score not critical */ }

      // Emit chat event
      emitChatEvent(room.id, 'gift', {
        type: 'gift',
        roomId: room.id,
        gift: {
          id: gift.id,
          senderName: sender.name,
          senderImage: sender.image,
          recipientName: recipient.name,
          giftName: giftType.name,
          giftIcon: giftType.icon,
          quantity,
          totalPrice,
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
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ROOM_TYPE', message: 'roomType "stream" veya "voice" olmalıdır' } },
        { status: 400 }
      )
    }

    return NextResponse.json({
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
    })

  } catch (error) {
    console.error('[LIVE/gift/send] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Hediye gönderilemedi' } },
      { status: 500 }
    )
  }
}
