export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getPlatformSetting } from '@/lib/agency-commission'
import { heavyLimiter } from '@/lib/rate-limiter'
import { recordLedger } from '@/lib/ledger'
import { createNotificationWithPush } from '@/lib/notify'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'

/**
 * POST /api/wallet/transfer — kullanıcıdan kullanıcıya Jeton veya CFC hediyesi.
 * Body: { recipient: username|id, currency: 'jeton' | 'cfc', amount: int }
 *
 * - Gönderenin kendi bakiyesinden düşer (personel dahil — bakiye yoksa gönderemez).
 * - Komisyon admin ayarından: jeton → `jeton_transfer_commission`,
 *   cfc → `cfc_transfer_commission` (yüzde). Komisyon platform hesabına yazılır.
 * - En az miktar: `jeton_transfer_min` / `cfc_transfer_min` (varsayılan 100).
 * - Düşüm atomik (koşullu UPDATE) — yetersiz bakiyede hiçbir şey değişmez.
 * Mevcut /api/gifts/send davranışı değişmez.
 */
export async function POST(req: NextRequest) {
  let record: string | null = null
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const senderId = authUser.id

    const { success: rateOk } = heavyLimiter.check(`wallet-transfer:${senderId}`)
    if (!rateOk) {
      return NextResponse.json({ success: false, error: 'Çok hızlı işlem yapıyorsunuz. Biraz bekleyin.' }, { status: 429 })
    }

    const replay = await beginIdempotent(req, 'wallet_transfer', senderId)
    if (replay.response) return replay.response
    record = replay.record

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }
    const currency = body?.currency === 'cfc' ? 'cfc' : body?.currency === 'jeton' ? 'jeton' : null
    const amount = Math.trunc(Number(body?.amount))
    const recipientKey = (body?.recipient ?? '').toString().trim()

    const fail = async (status: number, error: string) => {
      await releaseIdempotent(record)
      record = null
      return NextResponse.json({ success: false, error }, { status })
    }

    if (!currency) return fail(400, 'Geçersiz para birimi')
    if (!recipientKey) return fail(400, 'Alıcı gerekli')

    const minStr = await getPlatformSetting(`${currency}_transfer_min`, '100')
    const minAmount = Math.max(1, parseInt(minStr) || 100)
    if (!Number.isFinite(amount) || amount < minAmount) {
      return fail(400, `En az ${minAmount} ${currency === 'cfc' ? 'CFC' : 'jeton'} gönderebilirsiniz`)
    }

    const recipient = await prisma.user.findFirst({
      where: { OR: [{ username: recipientKey.toLowerCase() }, { id: recipientKey }] },
      select: { id: true, name: true, username: true },
    })
    if (!recipient) return fail(404, 'Kullanıcı bulunamadı')
    if (recipient.id === senderId) return fail(400, 'Kendinize gönderemezsiniz')

    const commStr = await getPlatformSetting(`${currency}_transfer_commission`, '0')
    const commPercent = Math.min(100, Math.max(0, parseInt(commStr) || 0))
    const commission = Math.floor((amount * commPercent) / 100)
    const net = amount - commission

    const field = currency === 'cfc' ? 'cfcBalance' : 'jetonBalance'

    let before = 0
    let after = 0
    try {
      await prisma.$transaction(async (tx: any) => {
        const sender = await tx.user.findUnique({ where: { id: senderId }, select: { [field]: true } })
        before = (sender?.[field] as number) ?? 0
        const debit = await tx.user.updateMany({
          where: { id: senderId, [field]: { gte: amount } },
          data: { [field]: { decrement: amount } },
        })
        if (debit.count !== 1) throw new Error('INSUFFICIENT_BALANCE')
        after = before - amount
        if (net > 0) {
          await tx.user.update({ where: { id: recipient.id }, data: { [field]: { increment: net } } })
        }
        if (currency === 'jeton') {
          await tx.jetonTransaction.create({
            data: {
              userId: senderId,
              amount: -amount,
              type: 'transfer_sent',
              description: `${recipient.name} kişisine ${amount} jeton gönderildi`,
              balanceBefore: before,
              balanceAfter: after,
            },
          })
          await tx.jetonTransaction.create({
            data: {
              userId: recipient.id,
              amount: net,
              type: 'transfer_received',
              description: `${authUser.name || 'Bir kullanıcı'} kişisinden ${net} jeton hediye`,
              balanceBefore: 0,
              balanceAfter: 0,
            },
          })
        }
      })
    } catch (e: any) {
      if (String(e?.message || '').includes('INSUFFICIENT_BALANCE')) {
        return fail(400, `Yetersiz ${currency === 'cfc' ? 'CFC' : 'jeton'} bakiyesi`)
      }
      throw e
    }

    const acct = currency === 'cfc' ? 'user_cfc' : 'user_jeton'
    const platformAcct = currency === 'cfc' ? 'platform_cfc' : 'platform_jeton'
    recordLedger({
      debit: { accountType: acct as any, accountId: senderId, balanceBefore: before, balanceAfter: after },
      credit: { accountType: acct as any, accountId: recipient.id },
      amount: net,
      currency,
      category: 'gift_send',
      description: `Kullanıcı transferi (${currency})`,
      referenceType: 'wallet_transfer',
      actorId: senderId,
    }).catch(() => {})
    if (commission > 0) {
      recordLedger({
        debit: { accountType: acct as any, accountId: senderId },
        credit: { accountType: platformAcct as any, accountId: 'PLATFORM' },
        amount: commission,
        currency,
        category: 'commission',
        description: `Transfer komisyonu %${commPercent}`,
        referenceType: 'wallet_transfer',
        actorId: senderId,
      }).catch(() => {})
    }

    const label = currency === 'cfc' ? 'CFC' : 'jeton'
    createNotificationWithPush({
      userId: recipient.id,
      type: 'gift',
      title: currency === 'cfc' ? 'CFC Hediyesi! 💎' : 'Jeton Hediyesi! 🪙',
      message: `size ${net} ${label} hediye gönderdi!`,
      fromUserId: senderId,
      fromUserName: authUser.name,
      data: JSON.stringify({ type: `${currency}_transfer`, amount: net, senderId }),
    } as any).catch(() => {})

    const payload = {
      success: true,
      data: {
        currency,
        amount,
        commission,
        commissionPercent: commPercent,
        received: net,
        balance: after,
        recipient: { id: recipient.id, name: recipient.name, username: recipient.username },
      },
    }
    await completeIdempotent(record, 200, payload)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[wallet/transfer] error:', error)
    await releaseIdempotent(record).catch(() => {})
    return NextResponse.json({ success: false, error: 'İşlem tamamlanamadı' }, { status: 500 })
  }
}

/** GET /api/wallet/transfer — mobil form için kurallar (min + komisyon). */
export async function GET(req: NextRequest) {
  const authUser = await authenticateRequest(req)
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const read = async (k: string, d: string) => parseInt(await getPlatformSetting(k, d)) || 0
  return NextResponse.json({
    success: true,
    data: {
      jeton: { min: Math.max(1, await read('jeton_transfer_min', '100')), commissionPercent: await read('jeton_transfer_commission', '0') },
      cfc: { min: Math.max(1, await read('cfc_transfer_min', '100')), commissionPercent: await read('cfc_transfer_commission', '0') },
    },
  })
}
