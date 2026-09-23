/**
 * BÖLÜM 20 §20 — Üyelik hediye etme.
 * POST /api/memberships/gift  { planId, receiverId | receiverEmail, paymentMethod?: 'jeton'|'cfc', message? }
 *
 * Mevcut satın alma akışının birebir eşi; tek fark üyeliğin ALICI'ya işlenmesi ve
 * kaydın MembershipGrant tablosuna source='gift' + giverId ile düşmesidir.
 * Jeton ödül / jeton indirim sistemlerine HİÇBİR müdahale yoktur; aynı debit ve
 * ledger kuralları kullanılır.
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { atomicDebitCredits, atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { authenticateRequest } from '@/lib/mobile-auth'
import { recordLedger } from '@/lib/ledger'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { applyMembership } from '@/lib/membership-lifecycle'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let idemRecord: string | null = null
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const giverId = authUser.id

    const rateLimited = await guardRateLimit(req, 'membership', { userId: giverId })
    if (rateLimited) return rateLimited

    const body = await req.json().catch(() => ({}))
    const planId = body?.planId
    const message: string | null = body?.message ? String(body.message).slice(0, 200) : null
    if (!planId) return NextResponse.json({ error: 'Plan ID zorunludur' }, { status: 400 })

    const receiver = body?.receiverId
      ? await prisma.user.findUnique({ where: { id: String(body.receiverId) }, select: { id: true, name: true, jetonBalance: true } })
      : body?.receiverEmail
        ? await prisma.user.findUnique({ where: { email: String(body.receiverEmail).toLowerCase().trim() }, select: { id: true, name: true, jetonBalance: true } })
        : null

    if (!receiver) return NextResponse.json({ error: 'Alıcı kullanıcı bulunamadı' }, { status: 404 })
    if (receiver.id === giverId) {
      return NextResponse.json({ error: 'Kendinize hediye gönderemezsiniz' }, { status: 400 })
    }

    const method = body?.paymentMethod === 'cfc' ? 'cfc' : 'jeton'

    const plan = await prisma.membershipPlan.findUnique({ where: { id: String(planId), isActive: true } })
    if (!plan) return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 })

    const giver = await prisma.user.findUnique({
      where: { id: giverId },
      select: { jetonBalance: true, credits: true, role: true, name: true },
    })
    if (!giver) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

    const isStaff = giver.role === 'yonetici'

    const idem = await beginIdempotent(req, 'membership_gift', giverId)
    if (idem.response) return idem.response
    idemRecord = idem.record

    // Ödeme — satın alma akışıyla aynı kurallar
    if (!isStaff) {
      if (method === 'cfc') {
        if (giver.credits < plan.price) {
          return NextResponse.json({ error: 'Yetersiz CFC bakiyesi' }, { status: 400 })
        }
        await atomicDebitCredits(prisma, giverId, plan.price)
      } else {
        if (giver.jetonBalance < plan.price) {
          return NextResponse.json({ error: 'Yetersiz jeton bakiyesi' }, { status: 400 })
        }
        await atomicDebitJeton(prisma, giverId, plan.price)
        await prisma.jetonTransaction.create({
          data: {
            userId: giverId,
            amount: -plan.price,
            type: 'spend',
            description: `${plan.name} üyeliği hediye edildi`,
            balanceBefore: giver.jetonBalance,
            balanceAfter: giver.jetonBalance - plan.price,
          },
        })
      }
    }

    const applied = await applyMembership({
      userId: receiver.id,
      tierKey: plan.tier,
      durationDays: plan.durationDays,
      source: 'gift',
      giverId,
      transactionId: plan.id,
      actorId: giverId,
      note: message || `${giver.name || 'Bir kullanıcı'} tarafından hediye edildi`,
    })
    if (!applied.ok) {
      releaseIdempotent(idemRecord).catch(() => {})
      return NextResponse.json({ error: applied.error || 'Üyelik atanamadı' }, { status: 400 })
    }

    await prisma.membershipPurchase.create({
      data: {
        userId: receiver.id,
        planId: plan.id,
        priceType: plan.priceType,
        pricePaid: plan.price,
        currency: plan.currency,
        startsAt: new Date(),
        expiresAt: applied.expiresAt ? new Date(applied.expiresAt) : new Date(Date.now() + plan.durationDays * 86400000),
        status: 'active',
        grantedBy: giverId,
      },
    })

    if (!isStaff && plan.price > 0) {
      const isCfc = method === 'cfc'
      recordLedger({
        debit: {
          accountType: isCfc ? 'user_cfc' : 'user_jeton',
          accountId: giverId,
          balanceBefore: isCfc ? giver.credits : giver.jetonBalance,
          balanceAfter: (isCfc ? giver.credits : giver.jetonBalance) - plan.price,
        },
        credit: { accountType: isCfc ? 'platform_cfc' : 'platform_jeton', accountId: 'platform' },
        amount: plan.price,
        category: 'membership',
        currency: isCfc ? 'cfc' : 'jeton',
        description: `${plan.name} üyelik hediyesi`,
        referenceType: 'MembershipPlan',
        referenceId: plan.id,
        actorId: giverId,
        metadata: { tier: plan.tier, durationDays: plan.durationDays, method, receiverId: receiver.id, gift: true },
      }).catch((e) => console.error('[Ledger][membership-gift]', e))
    }

    // Bonus jetonlar hediyede AL(ICI)ya yazılır — satın almadaki kural aynen korunur.
    if (plan.bonusJetons > 0) {
      const updatedReceiver = await prisma.user.update({
        where: { id: receiver.id },
        data: { jetonBalance: { increment: plan.bonusJetons } },
        select: { jetonBalance: true },
      })
      await prisma.jetonTransaction.create({
        data: {
          userId: receiver.id,
          amount: plan.bonusJetons,
          type: 'purchase',
          description: `${plan.name} üyelik hediyesi bonus jetonları`,
          balanceBefore: updatedReceiver.jetonBalance - plan.bonusJetons,
          balanceAfter: updatedReceiver.jetonBalance,
        },
      })
      recordLedger({
        debit: { accountType: 'platform_jeton', accountId: 'platform' },
        credit: {
          accountType: 'user_jeton',
          accountId: receiver.id,
          balanceBefore: updatedReceiver.jetonBalance - plan.bonusJetons,
          balanceAfter: updatedReceiver.jetonBalance,
        },
        amount: plan.bonusJetons,
        category: 'membership',
        currency: 'jeton',
        description: `${plan.name} üyelik hediyesi bonus jetonları`,
        referenceType: 'MembershipPlan',
        referenceId: plan.id,
        actorId: giverId,
      }).catch((e) => console.error('[Ledger][membership-gift-bonus]', e))
    }

    const responseBody = {
      success: true,
      message: `${receiver.name || 'Kullanıcı'} için ${plan.name} üyeliği hediye edildi!`,
      receiverId: receiver.id,
      membership: plan.tier,
      grantId: applied.grantId,
      expiresAt: applied.expiresAt || null,
    }
    completeIdempotent(idemRecord, 200, responseBody).catch(() => {})
    return NextResponse.json(responseBody)
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz bakiye', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Membership gift error:', error)
    releaseIdempotent(idemRecord).catch(() => {})
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
