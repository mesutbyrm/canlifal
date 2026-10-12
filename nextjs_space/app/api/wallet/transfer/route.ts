import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { recordLedger } from '@/lib/ledger'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'

export const dynamic = 'force-dynamic'

// Transfer kuralları (Flutter istemcisinin güvenli varsayılanlarıyla aynı).
// min: en az transfer miktarı; commissionPercent: alıcıya geçmeden kesilen yüzde.
const RULES = {
  jeton: { min: 100, commissionPercent: 0 },
  cfc: { min: 100, commissionPercent: 0 },
} as const

type Currency = keyof typeof RULES

const FIELD: Record<Currency, 'jetonBalance' | 'credits'> = { jeton: 'jetonBalance', cfc: 'credits' }
const ACCOUNT: Record<Currency, 'user_jeton' | 'user_cfc'> = { jeton: 'user_jeton', cfc: 'user_cfc' }
const PLATFORM: Record<Currency, 'platform_jeton' | 'platform_cfc'> = { jeton: 'platform_jeton', cfc: 'platform_cfc' }

// GET /api/wallet/transfer — transfer kuralları.
export async function GET(req: NextRequest) {
  const authUser = await authenticateRequest(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  return NextResponse.json({ success: true, data: RULES })
}

// POST /api/wallet/transfer — { recipient, currency: 'jeton'|'cfc', amount }
// Bakiye düşümü koşullu updateMany ile atomiktir; alıcı artışı aynı transaction içindedir.
// Yanıt: { success, data: { received, commission, balance } }
export async function POST(req: NextRequest) {
  let idemRecord: string | null = null
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const senderId = authUser.id

    const body = await req.json().catch(() => ({}))
    const recipientRaw = typeof body?.recipient === 'string' ? body.recipient.trim() : ''
    const currency = body?.currency as Currency
    const amount = Number(body?.amount)

    if (!recipientRaw) {
      return NextResponse.json({ error: 'Alıcı belirtilmelidir' }, { status: 400 })
    }
    if (currency !== 'jeton' && currency !== 'cfc') {
      return NextResponse.json({ error: 'Geçersiz para birimi' }, { status: 400 })
    }
    const rule = RULES[currency]
    if (!Number.isInteger(amount) || amount < rule.min) {
      return NextResponse.json({ error: `Minimum transfer: ${rule.min}` }, { status: 400 })
    }

    const idem = await beginIdempotent(req, 'wallet_transfer', senderId)
    if (idem.response) return idem.response
    idemRecord = idem.record

    const recipient = await prisma.user.findFirst({
      where: {
        OR: [{ id: recipientRaw }, { username: { equals: recipientRaw, mode: 'insensitive' } }],
      },
      select: { id: true, isBanned: true },
    })
    if (!recipient || recipient.isBanned) {
      await releaseIdempotent(idemRecord)
      return NextResponse.json({ error: 'Alıcı bulunamadı' }, { status: 404 })
    }
    if (recipient.id === senderId) {
      await releaseIdempotent(idemRecord)
      return NextResponse.json({ error: 'Kendinize transfer yapamazsınız' }, { status: 400 })
    }

    const commission = Math.floor((amount * rule.commissionPercent) / 100)
    const received = amount - commission
    const field = FIELD[currency]

    const balance = await prisma.$transaction(async (tx) => {
      const debited = await tx.user.updateMany({
        where: { id: senderId, [field]: { gte: amount } },
        data: { [field]: { decrement: amount } },
      })
      if (debited.count === 0) {
        throw new Error('INSUFFICIENT')
      }
      await tx.user.update({
        where: { id: recipient.id },
        data: { [field]: { increment: received } },
      })
      const after = await tx.user.findUnique({ where: { id: senderId }, select: { [field]: true } as any })
      return Number((after as any)?.[field] ?? 0)
    }).catch((e: any) => {
      if (e?.message === 'INSUFFICIENT') return null
      throw e
    })

    if (balance === null) {
      await releaseIdempotent(idemRecord)
      return NextResponse.json({ error: 'Yetersiz bakiye' }, { status: 400 })
    }

    // Ledger kayıtları (işlemden sonra; bakiye zaten atomik olarak güncellendi).
    await recordLedger({
      debit: { accountType: ACCOUNT[currency], accountId: senderId },
      credit: { accountType: ACCOUNT[currency], accountId: recipient.id },
      amount: received,
      category: 'tip',
      currency,
      referenceType: 'WalletTransfer',
      actorId: senderId,
      metadata: { amount, commission, commissionPercent: rule.commissionPercent },
    })
    if (commission > 0) {
      await recordLedger({
        debit: { accountType: ACCOUNT[currency], accountId: senderId },
        credit: { accountType: PLATFORM[currency], accountId: 'PLATFORM' },
        amount: commission,
        category: 'commission',
        currency,
        referenceType: 'WalletTransfer',
        actorId: senderId,
      })
    }

    const payload = { success: true, data: { received, commission, balance } }
    await completeIdempotent(idemRecord, 200, payload)
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('[Wallet Transfer POST] Error:', error)
    await releaseIdempotent(idemRecord)
    return NextResponse.json({ error: 'Transfer tamamlanamadı' }, { status: 500 })
  }
}
