import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { authenticateRequest } from '@/lib/mobile-auth'
import { processAgencyCommission } from '@/lib/agency-commission'
import { getCachedPlatformSetting } from '@/lib/cache'
import { recordMultiLeg, type LedgerLeg } from '@/lib/ledger'
import { recordContribution } from '@/lib/supporter-level'
import { recordTeamPoints } from '@/lib/team-points'
import { beginIdempotent, releaseIdempotent } from '@/lib/idempotency'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { parseJetonSource, resolveJetonSpend } from '@/lib/jeton-source'
import { GiftRecipientError, lockGiftBalances, saveGiftReceipt } from '@/lib/gift-recipient'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  let idemRecord: string | null = null
  let committed = false
  try {
    const mobile = await authenticateRequest(request)
    const session = !mobile ? await getServerSession(authOptions) : null
    const userId = mobile?.id || session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    const limited = await guardRateLimit(request, 'tip', { userId })
    if (limited) return limited
    // Replay precedes balance/session checks: a completed request survives a closed session.
    const idem = await beginIdempotent(request, 'tip', userId, { strict: true })
    if (idem.response) return idem.response
    idemRecord = idem.record
    const { amount, jetonSource } = await request.json()
    if (![50,100,150,200,250,300,350,400,450,500].includes(amount)) {
      return NextResponse.json({ error: 'Geçersiz bahşiş miktarı' }, { status: 400 })
    }
    const plan = await resolveJetonSpend(userId, amount, parseJetonSource(jetonSource))
    const commissionRate = Math.min(100, Math.max(0, Number(await getCachedPlatformSetting('commission_rate', '20')) || 0))
    const commission = Math.floor(amount * commissionRate / 100)
    const response = await prisma.$transaction(async (tx: any) => {
      await tx.$queryRawUnsafe('SELECT "id" FROM "live_sessions" WHERE "id" = $1 FOR UPDATE', params.sessionId)
      const live = await tx.liveSession.findUnique({ where: { id: params.sessionId },
        include: { teller: { include: { user: { select: { id: true, name: true } } } }, user: { select: { name: true } } } })
      if (!live || live.status !== 'active') throw new GiftRecipientError('SESSION_CLOSED', 'Seans artık aktif değil')
      if (live.userId !== userId) throw new GiftRecipientError('NOT_SESSION_USER', 'Sadece seansın kullanıcısı bahşiş verebilir')
      await lockGiftBalances(tx, [userId, live.teller.userId])
      const sender = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { jetonBalance: true, fakeJetonBalance: true } })
      if (!plan.skipDeduction) await atomicDebitJeton(tx, userId, amount, plan.source)
      const self = live.teller.userId === userId
      const net = self ? 0 : amount - commission
      const platform = self ? amount : commission
      const msg = await tx.liveSessionMessage.create({ data: { sessionId: params.sessionId, senderId: 'system', message: `[TIP:${amount}:${live.user.name || 'Kullanıcı'}]` } })
      await tx.liveSessionMessage.create({ data: { sessionId: params.sessionId, senderId: 'system', message: `[TIP_THANKS:${amount}:${live.teller.user.name || 'Falcı'}]` } })
      const options = { client: tx, strict: true }
      if (plan.countsAsFinance) {
        if (net > 0) await tx.liveFortuneTeller.update({ where: { id: live.tellerId }, data: { totalEarnings: { increment: net } } })
        await tx.jetonTransaction.create({ data: { userId, type: 'tip_sent', amount: -amount,
          balanceBefore: sender.jetonBalance, balanceAfter: sender.jetonBalance - amount, description: `Seans bahşişi: ${params.sessionId}` } })
        const legs: LedgerLeg[] = [{ accountType: 'user_jeton', accountId: userId, direction: 'debit', amount,
          balanceBefore: sender.jetonBalance, balanceAfter: sender.jetonBalance - amount }]
        if (net) legs.push({ accountType: 'teller_earning', accountId: live.tellerId, direction: 'credit', amount: net })
        if (platform) legs.push({ accountType: 'platform_jeton', accountId: 'platform', direction: 'credit', amount: platform })
        await recordMultiLeg({ legs, category: 'tip', currency: 'jeton', description: 'Fal seansı bahşişi',
          referenceType: 'LiveSession', referenceId: params.sessionId, actorId: userId,
          metadata: { tellerId: live.tellerId, commissionRate, tipId: msg.id, jetonSource: plan.source } }, options)
        await processAgencyCommission({ userId: live.teller.userId, earnedAmount: net, sourceType: 'tip', sourceId: msg.id }, options)
      }
      await recordContribution(userId, live.teller.userId, amount, options)
      await recordTeamPoints(userId, amount, options)
      const body = { success: true, transactionId: msg.id, amount, pointAmount: amount, jetonSource: plan.source,
        countsAsFinance: plan.countsAsFinance, tellerEarnings: plan.countsAsFinance ? net : 0,
        jetonsRemaining: sender.jetonBalance - (plan.countsAsFinance ? amount : 0) }
      await saveGiftReceipt(tx, idemRecord, body)
      return body
    }, { timeout: 20000 })
    committed = true
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof GiftRecipientError) return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    if (isInsufficientBalanceError(error)) return NextResponse.json({ error: 'Yetersiz bakiye', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    console.error('[Tip]', error)
    return NextResponse.json({ error: 'Bahşiş gönderilemedi' }, { status: 500 })
  } finally {
    if (!committed) await releaseIdempotent(idemRecord)
  }
}
