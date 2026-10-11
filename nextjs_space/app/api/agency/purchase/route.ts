import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { createBulkNotificationsWithPush } from '@/lib/notify'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'
import {
  AGENCY_JETON_PRODUCT,
  agencyTag,
  getAgencyPurchaseLimits,
  quoteAgencyPurchase,
  quoteAgencyPurchaseByTL,
} from '@/lib/agency-purchase'
import { periodRange } from '@/lib/agency-performance'

export const dynamic = 'force-dynamic'

const METHODS = ['bank_transfer', 'papara', 'whatsapp', 'other']

/** Yalnızca ONAYLI ajansın SAHİBİ toplu Jeton satın alabilir (para işlemi). */
async function ownedAgency(userId: string) {
  return prisma.agency.findFirst({
    where: { ownerId: userId, status: 'approved' },
    select: { id: true, name: true, level: true },
  })
}

/**
 * GET /api/agency/purchase?jeton=100000 veya ?tl=50000
 * → fiyat teklifi (normal fiyat, ajans indirimi/bonus, ödenecek tutar) + limitler + sipariş geçmişi.
 * jeton parametresi varsa Mod A (indirimli), tl parametresi varsa Mod B (bonuslu).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as any).user
  const agency = await ownedAgency(user.id)
  if (!agency) {
    return NextResponse.json({ success: false, error: 'Yalnızca onaylı ajans sahibi satın alabilir' }, { status: 403 })
  }
  const limits = await getAgencyPurchaseLimits()
  const url = new URL(req.url)
  const qJeton = Number(url.searchParams.get('jeton') || 0)
  const qTl = Number(url.searchParams.get('tl') || 0)
  const quote = qTl > 0
    ? await quoteAgencyPurchaseByTL(agency.id, qTl)
    : await quoteAgencyPurchase(agency.id, qJeton > 0 ? qJeton : limits.minJeton)
  const orders = await prisma.paymentNotification.findMany({
    where: { userId: user.id, productType: AGENCY_JETON_PRODUCT },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true, amount: true, requestedAmount: true, jetonLoaded: true, status: true,
      paymentMethod: true, createdAt: true, processedAt: true, adminNote: true,
    },
  })
  return NextResponse.json({
    success: true,
    data: { agency, quote, limits, orders },
  })
}

/**
 * POST /api/agency/purchase — ödeme bildirimiyle toplu Jeton siparişi.
 * Body: { jeton, paymentMethod, transactionId?, senderName?, notes?, proofUrl? }
 * Tutar sunucuda hesaplanır; Jeton ancak admin ödemeyi onaylayınca AJANS CÜZDANINA geçer.
 * İptal: POST /api/payments/notify/{id}/cancel (yalnız bekleyen).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as any).user

  const limited = await guardRateLimit(req, 'payment', { userId: user.id }).catch(() => null)
  if (limited) return limited

  const agency = await ownedAgency(user.id)
  if (!agency) {
    return NextResponse.json({ success: false, error: 'Yalnızca onaylı ajans sahibi satın alabilir' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const mode: 'jeton' | 'tl' = body.tl ? 'tl' : 'jeton'
  const jeton = mode === 'jeton' ? Math.floor(Number(body.jeton || 0)) : 0
  const tl = mode === 'tl' ? Math.max(0, Number(body.tl || 0)) : 0
  const paymentMethod = METHODS.includes(String(body.paymentMethod)) ? String(body.paymentMethod) : ''
  const limits = await getAgencyPurchaseLimits()
  if (!limits.enabled) {
    return NextResponse.json({ success: false, error: 'Ajans Jeton satın alma şu anda kapalı' }, { status: 403 })
  }
  if (!paymentMethod) {
    return NextResponse.json({ success: false, error: 'Ödeme yöntemi seçin' }, { status: 400 })
  }

  // Quote hesapla (mod'a göre)
  const quote = mode === 'tl'
    ? await quoteAgencyPurchaseByTL(agency.id, tl)
    : await quoteAgencyPurchase(agency.id, jeton)
  const effectiveJeton = quote.totalJeton

  if (!effectiveJeton || effectiveJeton < limits.minJeton) {
    return NextResponse.json({ success: false, error: `En az ${limits.minJeton.toLocaleString('tr-TR')} Jeton alınabilir` }, { status: 400 })
  }
  if (limits.maxJeton > 0 && effectiveJeton > limits.maxJeton) {
    return NextResponse.json({ success: false, error: `Tek siparişte en fazla ${limits.maxJeton.toLocaleString('tr-TR')} Jeton alınabilir` }, { status: 400 })
  }

  if (limits.dailyMaxJeton > 0) {
    // Bugünkü (TR) iptal/ret edilmemiş siparişlerin toplamı.
    const day = periodRange('daily')
    const today = await prisma.paymentNotification.aggregate({
      where: {
        userId: user.id,
        productType: AGENCY_JETON_PRODUCT,
        status: { notIn: ['cancelled', 'rejected'] },
        createdAt: { gte: day.start, lt: day.end },
      },
      _sum: { requestedAmount: true },
    })
    const used = today._sum.requestedAmount ?? 0
    if (used + effectiveJeton > limits.dailyMaxJeton) {
      const left = Math.max(0, limits.dailyMaxJeton - used)
      return NextResponse.json(
        { success: false, error: `Günlük alım limiti aşılıyor: bugün en fazla ${left.toLocaleString('tr-TR')} Jeton daha sipariş edebilirsiniz` },
        { status: 400 },
      )
    }
  }

  const pending = await prisma.paymentNotification.count({
    where: { userId: user.id, productType: AGENCY_JETON_PRODUCT, status: { in: ['pending', 'corrected'] } },
  })
  if (pending >= 3) {
    return NextResponse.json({ success: false, error: 'Onay bekleyen 3 siparişiniz var; önce onlar sonuçlansın' }, { status: 400 })
  }

  const idem = await beginIdempotent(req, 'agency_purchase', user.id)
  if (idem.response) return idem.response

  try {
    const modeLabel = quote.mode === 'tl'
      ? `[ajans fiyatı: ${quote.totalJeton} Jeton (${quote.jetonAmount}+${quote.bonusJeton} bonus) · %${quote.bonusPercent} bonus · ${quote.finalPriceTl.toFixed(2)} TL]`
      : `[ajans fiyatı: ${quote.jetonAmount} Jeton · normal ${quote.normalPriceTl.toFixed(2)} TL · %${quote.discountPercent} indirim → ${quote.finalPriceTl.toFixed(2)} TL]`
    const order = await prisma.paymentNotification.create({
      data: {
        userId: user.id,
        username: user.username || user.name || agency.name,
        paymentMethod,
        amount: quote.finalPriceTl,
        transactionId: body.transactionId ? String(body.transactionId).slice(0, 120) : null,
        senderName: body.senderName ? String(body.senderName).slice(0, 120) : null,
        notes: [agencyTag(agency.id), modeLabel, body.notes ? String(body.notes) : ''].filter(Boolean).join(' ').slice(0, 1000),
        status: 'pending',
        productType: AGENCY_JETON_PRODUCT,
        requestedAmount: quote.totalJeton,
        originalRequestedAmount: quote.totalJeton,
        proofUrl: body.proofUrl ? String(body.proofUrl).slice(0, 500) : null,
      },
      select: { id: true, amount: true, requestedAmount: true, status: true, createdAt: true },
    })

    // Ödeme yöneticilerine bildirim (best-effort).
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'moderator', 'site_manager'] } },
      select: { id: true },
      take: 50,
    }).catch(() => [] as { id: string }[])
    if (admins.length) {
      createBulkNotificationsWithPush({
        userIds: admins.map((a) => a.id),
        type: 'admin_payment_pending',
        title: 'Ajans Jeton siparişi',
        message: `${agency.name}: ${quote.totalJeton.toLocaleString('tr-TR')} Jeton · ${quote.finalPriceTl.toFixed(2)} TL ödeme bildirimi`,
        targetPath: '/admin/payments',
        targetId: order.id,
      }).catch(() => {})
    }

    recordAudit({
      actorId: user.id, action: 'agency_purchase_order', targetType: 'payment_notification', targetId: order.id,
      ip: getAuditIp(req),
      metadata: { agencyId: agency.id, jeton: quote.totalJeton, bonusJeton: quote.bonusJeton, mode: quote.mode, finalPriceTl: quote.finalPriceTl, discountPercent: quote.discountPercent, bonusPercent: quote.bonusPercent },
    }).catch(() => {})

    const payload = { success: true, data: { order, quote } }
    await completeIdempotent(idem.record, 200, payload)
    return NextResponse.json(payload)
  } catch (e) {
    await releaseIdempotent(idem.record)
    console.error('[agency/purchase] error:', e)
    return NextResponse.json({ success: false, error: 'Sipariş oluşturulamadı' }, { status: 500 })
  }
}
