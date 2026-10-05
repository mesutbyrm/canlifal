import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { atomicDebitCredits, atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { authenticateRequest } from '@/lib/mobile-auth'
import { recordLedger } from '@/lib/ledger'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { applyMembership } from '@/lib/membership-lifecycle'
import { invalidateUserEntitlements } from '@/lib/vip-entitlements'
import { parseJetonSource, resolveJetonSpend } from '@/lib/jeton-source'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let idemRecord: string | null = null
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const userId = authUser.id

    // Rate limit: üyelik satın alma
    const rateLimited = await guardRateLimit(req, 'membership', { userId })
    if (rateLimited) return rateLimited

    const { planId, paymentMethod, jetonSource } = await req.json()
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }
    // paymentMethod: 'jeton' or 'cfc' — defaults to 'jeton'
    const method = paymentMethod === 'cfc' ? 'cfc' : 'jeton'

    // Get the plan
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId, isActive: true }
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jetonBalance: true, credits: true, membership: true, membershipExpiresAt: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const memPlan = await resolveJetonSpend(userId, plan.price, parseJetonSource(jetonSource))
    const isStaff = memPlan.skipDeduction

    // Idempotency: reserved after validation
    const idem = await beginIdempotent(req, 'membership_purchase', userId)
    if (idem.response) return idem.response
    idemRecord = idem.record

    // Allow payment with jeton or CFC (staff skip payment)
    if (!isStaff) {
      if (method === 'cfc') {
        if (user.credits < plan.price) {
          return NextResponse.json({ error: 'Yetersiz CFC bakiyesi' }, { status: 400 })
        }
        await atomicDebitCredits(prisma, userId, plan.price)
      } else {
        if ((memPlan.source === 'fake' ? memPlan.fakeBalance : memPlan.realBalance) < plan.price) {
          return NextResponse.json({ error: 'Yetersiz jeton bakiyesi' }, { status: 400 })
        }
        await atomicDebitJeton(prisma, userId, plan.price, memPlan.source)
        if (memPlan.countsAsFinance) await prisma.jetonTransaction.create({
          data: {
            userId: userId,
            amount: -plan.price,
            type: 'spend',
            description: `${plan.name} üyelik satın alındı`,
            balanceBefore: user.jetonBalance,
            balanceAfter: user.jetonBalance - plan.price
          }
        })
      }
    }

    // Calculate expiration date
    const now = new Date()
    let startsAt = now
    
    // If user already has an active membership of same or higher tier, extend it
    if (user.membershipExpiresAt && user.membershipExpiresAt > now) {
      startsAt = user.membershipExpiresAt
    }
    
    const expiresAt = new Date(startsAt)
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays)

    // Create purchase record
    await prisma.membershipPurchase.create({
      data: {
        userId: userId,
        planId: plan.id,
        priceType: plan.priceType,
        pricePaid: plan.price,
        currency: plan.currency,
        startsAt,
        expiresAt,
        status: 'active'
      }
    })

    // Update user membership (BÖLÜM 20: merkezi yaşam döngüsü + yetenek cache invalidasyonu)
    // expiresAt burada hesaplandığı için aynen geçiriliyor — mevcut süre uzatma davranışı korunur.
    const applied = await applyMembership({
      userId,
      tierKey: plan.tier,
      expiresAt,
      source: 'purchase',
      transactionId: plan.id,
      actorId: userId,
      note: `${plan.name} satın alma`,
    })
    if (!applied.ok) {
      // Geriye dönük güvenlik: merkezi katman başarısız olursa eski davranışa düş
      await prisma.user.update({
        where: { id: userId },
        data: { membership: plan.tier, membershipExpiresAt: expiresAt },
      })
      try { await invalidateUserEntitlements(userId) } catch {}
    }

    // ── Immutable ledger (fire-and-forget) ──
    if (!isStaff && plan.price > 0) {
      const isCfc = method === 'cfc'
      recordLedger({
        debit: {
          accountType: isCfc ? 'user_cfc' : 'user_jeton',
          accountId: userId,
          balanceBefore: isCfc ? user.credits : user.jetonBalance,
          balanceAfter: (isCfc ? user.credits : user.jetonBalance) - plan.price,
        },
        credit: {
          accountType: isCfc ? 'platform_cfc' : 'platform_jeton',
          accountId: 'platform',
        },
        amount: plan.price,
        category: 'membership',
        currency: isCfc ? 'cfc' : 'jeton',
        description: `${plan.name} üyelik satın alımı`,
        referenceType: 'MembershipPlan',
        referenceId: plan.id,
        actorId: userId,
        metadata: { tier: plan.tier, durationDays: plan.durationDays, method },
      }).catch((e) => console.error('[Ledger][membership]', e))
    }

    // Add bonus jetons if any
    if (plan.bonusJetons > 0) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { jetonBalance: { increment: plan.bonusJetons } },
        select: { jetonBalance: true }
      })

      await prisma.jetonTransaction.create({
        data: {
          userId: userId,
          amount: plan.bonusJetons,
          type: 'purchase',
          description: `${plan.name} üyelik bonus jetonları`,
          balanceBefore: updatedUser.jetonBalance - plan.bonusJetons,
          balanceAfter: updatedUser.jetonBalance
        }
      })

      recordLedger({
        debit: { accountType: 'platform_jeton', accountId: 'platform' },
        credit: {
          accountType: 'user_jeton',
          accountId: userId,
          balanceBefore: updatedUser.jetonBalance - plan.bonusJetons,
          balanceAfter: updatedUser.jetonBalance,
        },
        amount: plan.bonusJetons,
        category: 'membership',
        currency: 'jeton',
        description: `${plan.name} üyelik bonus jetonları`,
        referenceType: 'MembershipPlan',
        referenceId: plan.id,
        actorId: userId,
      }).catch((e) => console.error('[Ledger][membership-bonus]', e))
    }

    const responseBody = {
      success: true,
      message: `${plan.name} üyeliğiniz aktifleştirildi!`,
      membership: plan.tier,
      expiresAt: expiresAt.toISOString()
    }
    completeIdempotent(idemRecord, 200, responseBody).catch(() => {})
    return NextResponse.json(responseBody)
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz bakiye', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Membership purchase error:', error)
    releaseIdempotent(idemRecord).catch(() => {})
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
