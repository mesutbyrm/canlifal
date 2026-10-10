import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { authenticateRequest } from '@/lib/mobile-auth'
import { createNotificationWithPush } from '@/lib/notify'
import { parseJetonSource, resolveJetonSpend } from '@/lib/jeton-source'
import { processAgencyCommission, getPlatformSetting } from '@/lib/agency-commission'
import { getCachedPlatformSetting } from '@/lib/cache'
import { heavyLimiter } from '@/lib/rate-limiter'
import { recordLedger } from '@/lib/ledger'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'

async function createGiftAnnouncement(
  senderName: string | null, senderUsername: string | null,
  recipientName: string | null, recipientUsername: string | null,
  giftIcon: string, giftTypeName: string, amount: number,
  giftTypeId?: string
) {
  // Check if gift announcements are enabled in admin settings (cached)
  const giftAnnouncementSettingsRaw = await getCachedPlatformSetting('gift_announcement_settings', '')
  const giftAnnouncementSettings = giftAnnouncementSettingsRaw ? { value: giftAnnouncementSettingsRaw } : null
  let maxPasses = 1
  let expireMinutes = 3
  let minAmount = 1000
  let selectedGiftTypes: string[] = []
  if (giftAnnouncementSettings) {
    try {
      const s = JSON.parse(giftAnnouncementSettings.value)
      if (s.enabled === false) return
      maxPasses = s.maxPasses ?? 1
      expireMinutes = s.expireMinutes ?? 3
      minAmount = s.minAmount ?? 1000
      selectedGiftTypes = s.selectedGiftTypes ?? []
    } catch {}
  }

  // Check minimum amount threshold
  if (amount < minAmount) return

  // Check if this gift type is allowed (empty array = all allowed)
  if (selectedGiftTypes.length > 0 && giftTypeId && !selectedGiftTypes.includes(giftTypeId)) return

  const sender = senderUsername || senderName || 'Kullanıcı'
  const recipient = recipientUsername || recipientName || 'Kullanıcı'
  const message = `🎁 ${sender} → ${giftIcon} ${giftTypeName} (${amount} Jeton) → ${recipient} 🎁`

  await prisma.siteAnnouncement.create({
    data: {
      type: 'gift_announcement',
      message,
      color: 'gift',
      maxPasses,
      expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000)
    }
  })
}

export async function POST(req: NextRequest) {
  let _idempotencyRecord: string | null = null
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const userId = authUser.id

    // Rate limit gift sending per user (10/min)
    const { success: rateLimitOk } = heavyLimiter.check(`gift:${userId}`)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Çok hızlı hediye gönderiyorsunuz. Biraz bekleyin.' }, { status: 429 })
    }

    // Faz 22 (§71) — idempotency koruması
    const replay = await beginIdempotent(req, 'gift_send', userId)
    if (replay.response) return replay.response
    _idempotencyRecord = replay.record

    const { recipientUsername, giftTypeId, jetonAmount, type, jetonSource, clientPrice } = await req.json()
    // type: 'gift' or 'jeton'

    if (!recipientUsername) {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 })
    }

    // Find recipient
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { username: recipientUsername.toLowerCase() },
          { id: recipientUsername }
        ]
      },
      select: { id: true, name: true, username: true }
    })

    if (!recipient) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    if (recipient.id === userId) {
      return NextResponse.json({ error: 'Cannot send gift to yourself' }, { status: 400 })
    }

    // Check reciprocal gift block: if recipient gifted sender today, block it
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const reciprocalGift = await prisma.notification.findFirst({
      where: {
        userId: userId,
        type: 'gift_received',
        fromUserId: recipient.id,
        createdAt: { gte: todayStart }
      }
    })
    if (reciprocalGift) {
      return NextResponse.json({ 
        error: 'reciprocal_blocked',
        message: 'Kurnazlık yapma biz geleceği görürüz 😜'
      }, { status: 403 })
    }

    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, credits: true, jetonBalance: true, role: true }
    })

    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
    }

    // Sahte/gerçek jeton seçimi: sahte harcama alıcıya bakiye olarak yansımaz
    // ve kar/zarara işlemez.
    const spendPlan = await resolveJetonSpend(sender.id, 1, parseJetonSource(jetonSource))
    const isStaff = spendPlan.skipDeduction
    const senderExcluded = !spendPlan.countsAsFinance

    if (type === 'gift' && giftTypeId) {
      // Send a gift item
      const giftType = await prisma.giftType.findUnique({ where: { id: giftTypeId } })
      if (!giftType) {
        return NextResponse.json({ error: 'Gift type not found' }, { status: 404 })
      }

      const senderJetons = sender.jetonBalance ?? 0
      if (!isStaff && senderJetons < giftType.price) {
        return NextResponse.json({ error: 'Yetersiz jeton' }, { status: 400 })
      }

      // §6 Client price validation — istemci eski/sahte fiyat gönderemez
      if (typeof clientPrice === 'number' && clientPrice !== giftType.price) {
        return NextResponse.json(
          { error: 'PRICE_MISMATCH', serverPrice: giftType.price, clientPrice,
            message: 'Hediye fiyatı değişti, lütfen katalog bilgisini güncelleyin' },
          { status: 409 }
        )
      }

      // Get configurable commission for direct gifts (default 0% - no commission on direct gifts)
      const directGiftCommStr = await getPlatformSetting('direct_gift_commission', '0')
      const directGiftCommPercent = Math.min(100, Math.max(0, parseInt(directGiftCommStr) || 0))
      const commissionAmount = directGiftCommPercent > 0 ? Math.floor(giftType.price * directGiftCommPercent / 100) : 0
      const recipientAmount = giftType.price - commissionAmount

      // Deduct jetons from sender (staff skip)
      if (!isStaff) {
        await atomicDebitJeton(prisma, sender.id, giftType.price, spendPlan.source)
        await prisma.jetonTransaction.create({
          data: {
            userId: sender.id,
            amount: -giftType.price,
            type: 'gift_sent',
            description: `${giftType.name} hediyesi ${recipient.name} kişisine gönderildi`,
            balanceBefore: senderJetons,
            balanceAfter: senderJetons - giftType.price
          }
        })
      }

      // Credit recipient (minus commission) - sadece normal kullanıcılardan
      if (!senderExcluded && recipientAmount > 0) {
        const recipientUser = await prisma.user.findUnique({ where: { id: recipient.id }, select: { jetonBalance: true } })
        const rBefore = recipientUser?.jetonBalance ?? 0
        await prisma.user.update({
          where: { id: recipient.id },
          data: { jetonBalance: { increment: recipientAmount } }
        })
        await prisma.jetonTransaction.create({
          data: {
            userId: recipient.id,
            amount: recipientAmount,
            type: 'gift_received',
            description: `${sender.name} tarafından ${giftType.name} hediyesi alındı${commissionAmount > 0 ? ` (%${directGiftCommPercent} komisyon düşüldü)` : ''}`,
            balanceBefore: rBefore,
            balanceAfter: rBefore + recipientAmount
          }
        })

        // Process agency commission
        processAgencyCommission({
          userId: recipient.id,
          earnedAmount: recipientAmount,
          sourceType: 'direct_gift',
        }).catch(err => console.error('[Direct Gift] Agency commission error:', err))
      }

      // Send notification + push to recipient
      createNotificationWithPush({
        userId: recipient.id,
        type: 'gift',
        title: 'Hediye Aldınız! 🎁',
        message: `size ${giftType.name} hediye gönderdi!`,
        fromUserId: sender.id,
        fromUserName: sender.name,
        data: JSON.stringify({
          giftTypeId: giftType.id,
          giftName: giftType.name,
          giftIcon: giftType.icon,
          senderId: sender.id,
          senderName: sender.name
        })
      }).catch(err => console.error('Gift notification error:', err))

      // Auto-create scrolling announcement (settings determine threshold)
      createGiftAnnouncement(sender.name, sender.username, recipient.name, recipient.username, giftType.icon, giftType.name, giftType.price, giftType.id).catch(err => console.error('Gift announcement error:', err))

      // Ledger: record gift send (fire-and-forget)
      if (!isStaff) {
        recordLedger({
          debit: { accountType: 'user_jeton', accountId: sender.id, balanceBefore: senderJetons, balanceAfter: senderJetons - giftType.price },
          credit: { accountType: senderExcluded ? 'platform_jeton' : 'user_jeton', accountId: senderExcluded ? 'PLATFORM' : recipient.id },
          amount: giftType.price,
          category: 'gift_send',
          referenceType: 'GiftType',
          referenceId: giftType.id,
          actorId: sender.id,
          metadata: { giftName: giftType.name, recipientId: recipient.id, commission: commissionAmount },
        }).catch(e => console.error('[Ledger] gift send error:', e))
      }

      const isBigGift = giftType.price >= 1000
      const giftPayload = {
        success: true,
        message: `${giftType.name} hediyesi ${recipient.name} kişisine gönderildi! 🎁`,
        bigGift: isBigGift ? {
          senderName: sender.name,
          recipientName: recipient.name,
          giftIcon: giftType.icon,
          giftType: giftType.name,
          amount: giftType.price
        } : null
      }
      await completeIdempotent(replay.record, 200, giftPayload)
      return NextResponse.json(giftPayload)

    } else if (type === 'jeton' && jetonAmount) {
      // Send jetons
      const amount = parseInt(jetonAmount)
      if (isNaN(amount) || amount < 1) {
        return NextResponse.json({ error: 'Invalid jeton amount' }, { status: 400 })
      }

      // Handle null jetonBalance - default to 0 if null
      const senderJetonBalance = sender.jetonBalance ?? 0
      
      console.log('[Gift Send] Jeton transfer attempt:', {
        senderId: sender.id,
        senderName: sender.name,
        senderJetonBalance: sender.jetonBalance,
        effectiveBalance: senderJetonBalance,
        requestedAmount: amount
      })

      if (!isStaff && senderJetonBalance < amount) {
        return NextResponse.json({ error: 'Yetersiz jeton' }, { status: 400 })
      }

      // Get configurable commission for jeton transfers (default 0%)
      const jetonTransferCommStr = await getPlatformSetting('jeton_transfer_commission', '0')
      const jetonTransferCommPercent = Math.min(100, Math.max(0, parseInt(jetonTransferCommStr) || 0))
      const jetonCommission = jetonTransferCommPercent > 0 ? Math.floor(amount * jetonTransferCommPercent / 100) : 0
      const jetonRecipientAmount = amount - jetonCommission

      if (!isStaff) {
        // Deduct from sender
        await atomicDebitJeton(prisma, sender.id, amount, spendPlan.source)
        // Record sender transaction
        await prisma.jetonTransaction.create({
          data: {
            userId: sender.id,
            amount: -amount,
            type: 'spend',
            description: `${recipient.name} kişisine ${amount} jeton gönderildi`,
            balanceBefore: sender.jetonBalance,
            balanceAfter: (sender.jetonBalance ?? 0) - amount
          }
        })
      }

      // Add to recipient - sadece normal kullanıcılardan
      if (!senderExcluded && jetonRecipientAmount > 0) {
        await prisma.user.update({
          where: { id: recipient.id },
          data: { jetonBalance: { increment: jetonRecipientAmount } }
        })

        // Process agency commission
        processAgencyCommission({
          userId: recipient.id,
          earnedAmount: jetonRecipientAmount,
          sourceType: 'direct_gift',
        }).catch(err => console.error('[Jeton Transfer] Agency commission error:', err))
      }

      // Record recipient transaction (only if not excluded)
      if (!senderExcluded) {
        await prisma.jetonTransaction.create({
          data: {
            userId: recipient.id,
            amount: amount,
            type: 'purchase',
            description: `${sender.name} kişisinden ${amount} jeton hediye alındı`,
            balanceBefore: 0,
            balanceAfter: 0
          }
        })
      }

      // Send notification
      createNotificationWithPush({
        userId: recipient.id,
        type: 'gift',
        title: 'Jeton Hediyesi! 🪙',
        message: `size ${amount} jeton hediye gönderdi!`,
        fromUserId: sender.id,
        fromUserName: sender.name,
        data: JSON.stringify({
          type: 'jeton',
          amount,
          senderId: sender.id,
          senderName: sender.name
        })
      }).catch(err => console.error('Jeton gift notification error:', err))

      // Auto-create scrolling announcement (settings determine threshold)
      createGiftAnnouncement(sender.name, sender.username, recipient.name, recipient.username, '🪙', 'Jeton', amount).catch(err => console.error('Jeton gift announcement error:', err))
      // Ledger: record jeton transfer (fire-and-forget)
      if (!isStaff) {
        recordLedger({
          debit: { accountType: 'user_jeton', accountId: sender.id, balanceBefore: senderJetonBalance, balanceAfter: senderJetonBalance - amount },
          credit: { accountType: senderExcluded ? 'platform_jeton' : 'user_jeton', accountId: senderExcluded ? 'PLATFORM' : recipient.id },
          amount,
          category: 'gift_send',
          actorId: sender.id,
          metadata: { type: 'jeton_transfer', recipientId: recipient.id, commission: jetonCommission },
        }).catch(e => console.error('[Ledger] jeton transfer error:', e))
      }

      const isBigJetonGift = amount >= 1000
      const jetonPayload = {
        success: true,
        message: `${amount} jeton ${recipient.name} kişisine gönderildi!`,
        bigGift: isBigJetonGift ? {
          senderName: sender.name,
          recipientName: recipient.name,
          giftIcon: '🪙',
          giftType: 'Jeton',
          amount
        } : null
      }
      await completeIdempotent(replay.record, 200, jetonPayload)
      return NextResponse.json(jetonPayload)
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  } catch (error) {
    await releaseIdempotent(_idempotencyRecord)
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz jeton bakiyesi', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Gift send error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
