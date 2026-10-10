import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'
import { hasPermission } from '@/lib/permissions'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { requireConfirmation } from '@/lib/critical-confirm'
import { recordLedger } from '@/lib/ledger'
import { createNotificationWithPush } from '@/lib/notify'
import { awardTopupCommissions } from '@/lib/referral-commission'
import { applyTopupBonus } from '@/lib/currency-branding'
import { decoratePaymentNotification } from '@/lib/payment-status'
import { topUpWallet } from '@/lib/agency-wallet'
import { AGENCY_JETON_PRODUCT, agencyIdFromNotes } from '@/lib/agency-purchase'
import {
  computeJetonPrice,
  getJetonUnitPrice,
  getCfcUnitPrice,
  computeCfcPrice,
  getDiscountSettings,
  round2,
  PRICE_TOLERANCE,
} from '@/lib/jeton-pricing'

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ok(data: any) { return NextResponse.json(data) }
function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ['approved', 'rejected', 'corrected', 'cancelled'],
  corrected: ['approved', 'rejected', 'cancelled'],
  rejected:  [],          // terminal
  approved:  ['refunded'], // only refund after approval
  cancelled: [],          // terminal
  refunded:  [],          // terminal
}

function canTransition(from: string, to: string): boolean {
  return (VALID_TRANSITIONS[from] || []).includes(to)
}

/* ------------------------------------------------------------------ */
/*  GET — list / stats / detail                                        */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  try {
    const actor = await resolveUser(req)
    if (!actor) return err('Oturum açmanız gerekiyor', 401)
    if (!isAdminRole(actor.role)) return err('Erişim reddedildi', 403)
    if (!(await hasPermission(actor.role, 'payment.view', actor.id)))
      return err('Bu işlem için yetkiniz yok', 403)

    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'list'

    /* --- stats view ------------------------------------------------ */
    if (view === 'stats') {
      const [pending, approved, rejected, corrected, cancelled] = await Promise.all([
        prisma.paymentNotification.count({ where: { status: 'pending' } }),
        prisma.paymentNotification.count({ where: { status: 'approved' } }),
        prisma.paymentNotification.count({ where: { status: 'rejected' } }),
        prisma.paymentNotification.count({ where: { status: 'corrected' } }),
        prisma.paymentNotification.count({ where: { status: 'cancelled' } }),
      ])
      const aggs = await prisma.paymentNotification.aggregate({
        where: { status: 'approved', creditApplied: true },
        _sum: { amount: true, jetonLoaded: true, cfcLoaded: true, goldDaysLoaded: true },
      })

      // §9/§17 — Jeton ve CFC istatistikleri AYRI raporlanır.
      const perType = async (pt: string) => {
        const [p, a, r] = await Promise.all([
          prisma.paymentNotification.count({ where: { productType: pt, status: 'pending' } }),
          prisma.paymentNotification.count({ where: { productType: pt, status: 'approved' } }),
          prisma.paymentNotification.count({ where: { productType: pt, status: 'rejected' } }),
        ])
        const sum = await prisma.paymentNotification.aggregate({
          where: { productType: pt, status: 'approved', creditApplied: true },
          _sum: { amount: true, jetonLoaded: true, cfcLoaded: true },
        })
        return {
          pending: p,
          approved: a,
          rejected: r,
          revenueTRY: sum._sum.amount || 0,
          unitsSold: pt === 'cfc' ? sum._sum.cfcLoaded || 0 : sum._sum.jetonLoaded || 0,
        }
      }
      const [jetonStats, cfcStats, goldStats] = await Promise.all([
        perType('jeton'),
        perType('cfc'),
        perType('gold'),
      ])
      const [unitPrice, cfcUnitPrice, discount] = await Promise.all([
        getJetonUnitPrice(),
        getCfcUnitPrice(),
        getDiscountSettings(),
      ])

      return ok({
        counts: { pending, approved, rejected, corrected, cancelled },
        totals: {
          amountTRY: aggs._sum.amount || 0,
          jetonLoaded: aggs._sum.jetonLoaded || 0,
          cfcLoaded: aggs._sum.cfcLoaded || 0,
          goldDaysLoaded: aggs._sum.goldDaysLoaded || 0,
        },
        pricing: {
          jetonUnitPrice: unitPrice,
          cfcUnitPrice,
          discountEnabled: discount.enabled,
          discountPercent: discount.percent,
          topupBonusEnabled: discount.topupBonusEnabled,
        },
        jeton: jetonStats,
        cfc: cfcStats,
        gold: goldStats,
      })
    }

    /* --- detail view ------------------------------------------------ */
    if (view === 'detail') {
      const id = searchParams.get('id')
      if (!id) return err('id gerekli')
      const pn = await prisma.paymentNotification.findUnique({ where: { id } })
      if (!pn) return err('Bulunamadı', 404)
      // Fetch user snapshot
      const user = await prisma.user.findUnique({
        where: { id: pn.userId },
        select: { id: true, name: true, username: true, email: true, image: true, jetonBalance: true, cfcBalance: true, credits: true, membership: true },
      })
      const [uP, cP] = await Promise.all([getJetonUnitPrice(), getCfcUnitPrice()])
      return ok({
        notification: decoratePaymentNotification(pn, { unitPrice: uP, cfcUnitPrice: cP }),
        user,
      })
    }

    /* --- list view (default) --------------------------------------- */
    const status = searchParams.get('status') || undefined
    const productType = searchParams.get('productType') || undefined
    const userId = searchParams.get('userId') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc'

    const where: any = {}
    if (status) where.status = status
    if (productType) where.productType = productType
    if (userId) where.userId = userId

    const [notifications, total] = await Promise.all([
      prisma.paymentNotification.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paymentNotification.count({ where }),
    ])

    const [uP2, cP2] = await Promise.all([getJetonUnitPrice(), getCfcUnitPrice()])
    const decorated = notifications.map((n) =>
      decoratePaymentNotification(n, { unitPrice: uP2, cfcUnitPrice: cP2 })
    )

    return ok({
      notifications: decorated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      pricing: { jetonUnitPrice: uP2, cfcUnitPrice: cP2 },
    })
  } catch (error) {
    console.error('Admin GET payments error:', error)
    return err('Bir hata oluştu', 500)
  }
}

/* ------------------------------------------------------------------ */
/*  POST — all payment admin actions                                   */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  // Atomik çift-onay kilidi: hata durumunda serbest bırakılır.
  let claimedNotificationId: string | null = null
  try {
    const actor = await resolveUser(req)
    if (!actor) return err('Oturum açmanız gerekiyor', 401)
    if (!isAdminRole(actor.role)) return err('Erişim reddedildi', 403)

    const body = await req.json()
    const { action } = body
    if (!action) return err('action gerekli')
    const ip = getAuditIp(req)

    // Kritik işlem onayı (spec §88) — backend zorunluluğu
    const CONFIRM_MAP: Record<string, string> = {
      approve: 'payment_approve',
      correct: 'payment_correct',
      refund: 'payment_refund',
      manual_load: 'payment_approve',
    }
    if (CONFIRM_MAP[action]) {
      const guard = requireConfirmation(CONFIRM_MAP[action], body.confirm, {
        summary:
          body.loadAmount || body.correctedAmount
            ? `${body.loadAmount || body.correctedAmount}`
            : undefined,
      })
      if (guard) return guard
    }

    switch (action) {
      /* ============================================================ */
      /*  APPROVE                                                      */
      /* ============================================================ */
      case 'approve': {
        if (!(await hasPermission(actor.role, 'payment.approve', actor.id)))
          return err('Onay yetkiniz yok', 403)

        const { notificationId, loadAmount, adminNote } = body
        if (!notificationId) return err('notificationId gerekli')

        const pn = await prisma.paymentNotification.findUnique({ where: { id: notificationId } })
        if (!pn) return err('Ödeme bildirimi bulunamadı', 404)
        if (!canTransition(pn.status, 'approved'))
          return err(`Bu bildirim "${pn.status}" durumunda, onaylanamaz`)
        if (pn.creditApplied)
          return err('Bu ödeme için bakiye zaten yüklenmiş (idempotency)', 409)
        if (pn.productType === AGENCY_JETON_PRODUCT) {
          const aid = agencyIdFromNotes(pn.notes)
          const ag = aid ? await prisma.agency.findUnique({ where: { id: aid }, select: { ownerId: true, status: true } }) : null
          if (!ag || ag.ownerId !== pn.userId || ag.status !== 'approved')
            return err('Ajans bulunamadı, onaylı değil veya talep sahibi artık ajans sahibi değil', 400)
        }

        // Determine amount to load
        const effectiveAmount = loadAmount
          ? Math.max(1, parseInt(loadAmount))
          : (pn.correctedAmount || pn.requestedAmount || 0)
        if (effectiveAmount < 1) return err('Yüklenecek miktar belirtilmeli')

        // ── SUNUCU TARAFI FİYAT YENİDEN HESABI (§7) ──
        // Onay anında TL tutarı = adet × güncel birim fiyat olarak yeniden
        // hesaplanır. Kayıttaki tutar farklıysa doğru değerle düzeltilir.
        let recomputedTRY: number | null = null
        if (pn.productType === 'jeton' || pn.productType === 'cfc') {
          const quote =
            pn.productType === 'jeton'
              ? await computeJetonPrice(effectiveAmount)
              : await computeCfcPrice(effectiveAmount)
          recomputedTRY = quote.finalAmount
          if (Math.abs(round2(pn.amount) - recomputedTRY) > PRICE_TOLERANCE) {
            await prisma.paymentNotification.update({
              where: { id: notificationId },
              data: {
                amount: recomputedTRY,
                notes: [pn.notes || '', `[düzeltildi: ${round2(pn.amount).toFixed(2)} TL → ${recomputedTRY.toFixed(2)} TL]`]
                  .filter(Boolean)
                  .join(' ')
                  .slice(0, 1000),
              },
            })
            pn.amount = recomputedTRY
          }
        }

        // ── ATOMİK ÇİFT-ONAY KORUMASI (§12) ──
        // creditApplied bayrağını koşullu olarak sahiplen; ikinci istek 0 satır günceller.
        // Durum da koşulda: aynı anda ret/iptal edilen bildirime bakiye yüklenmez.
        const claim = await prisma.paymentNotification.updateMany({
          where: { id: notificationId, creditApplied: false, status: { in: ['pending', 'corrected'] } },
          data: { creditApplied: true, creditAppliedAt: new Date() },
        })
        if (claim.count === 0)
          return err('Bu ödeme için bakiye zaten yüklenmiş (idempotency)', 409)
        claimedNotificationId = notificationId

        const targetUser = await prisma.user.findUnique({
          where: { id: pn.userId },
          select: { jetonBalance: true, cfcBalance: true, credits: true, membership: true, membershipExpiresAt: true },
        })
        if (!targetUser) return err('Kullanıcı bulunamadı', 404)

        const adminUser = await prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } })

        // --- Apply based on productType ---
        if (pn.productType === 'jeton') {
          const before = targetUser.jetonBalance || 0
          const after = before + effectiveAmount

          await prisma.$transaction([
            prisma.user.update({ where: { id: pn.userId }, data: { jetonBalance: { increment: effectiveAmount } } }), // mutlak değer değil: eşzamanlı harcama kaybolmasın
            prisma.jetonTransaction.create({
              data: {
                userId: pn.userId,
                amount: effectiveAmount,
                type: 'purchase',
                description: `${pn.amount} TL ödeme - ${pn.paymentMethod} (Ref: ${notificationId.slice(-8)})`,
                balanceBefore: before,
                balanceAfter: after,
              },
            }),
            prisma.paymentNotification.update({
              where: { id: notificationId },
              data: {
                status: 'approved',
                jetonLoaded: effectiveAmount,
                processedBy: actor.id,
                processedByName: adminUser?.name || 'Admin',
                processedAt: new Date(),
                adminNote: adminNote || null,
                creditApplied: true,
                creditAppliedAt: new Date(),
              },
            }),
          ])

          recordLedger({
            debit: { accountType: 'platform_jeton', accountId: 'platform' },
            credit: { accountType: 'user_jeton', accountId: pn.userId, balanceBefore: before, balanceAfter: after },
            amount: effectiveAmount,
            category: 'purchase',
            currency: 'jeton',
            description: `Ödeme onay - ${pn.amount} TL`,
            referenceType: 'payment_notification',
            referenceId: notificationId,
          }).catch(() => {})

          // Commission & bonus (fire-and-forget)
          awardTopupCommissions({ userId: pn.userId, amount: effectiveAmount, currency: 'jeton', sourceType: 'jeton_payment', sourceId: notificationId }).catch(() => {})
          // Otomatik yükleme bonusu VARSAYILAN OLARAK KAPALI (§2/§15).
          getDiscountSettings()
            .then((d) => {
              if (d.topupBonusEnabled)
                return applyTopupBonus({ userId: pn.userId, amount: effectiveAmount, currency: 'jeton', sourceType: 'jeton_payment', sourceId: notificationId })
            })
            .catch(() => {})

        } else if (pn.productType === 'cfc') {
          const before = targetUser.cfcBalance || 0
          const after = before + effectiveAmount

          await prisma.$transaction([
            prisma.user.update({ where: { id: pn.userId }, data: { cfcBalance: { increment: effectiveAmount } } }), // mutlak değer değil
            prisma.paymentNotification.update({
              where: { id: notificationId },
              data: {
                status: 'approved',
                cfcLoaded: effectiveAmount,
                processedBy: actor.id,
                processedByName: adminUser?.name || 'Admin',
                processedAt: new Date(),
                adminNote: adminNote || null,
                creditApplied: true,
                creditAppliedAt: new Date(),
              },
            }),
          ])

          recordLedger({
            debit: { accountType: 'platform_cfc', accountId: 'platform' },
            credit: { accountType: 'user_cfc', accountId: pn.userId, balanceBefore: before, balanceAfter: after },
            amount: effectiveAmount,
            category: 'purchase',
            currency: 'cfc',
            description: `CFC ödeme onay - ${pn.amount} TL`,
            referenceType: 'payment_notification',
            referenceId: notificationId,
          }).catch(() => {})

          awardTopupCommissions({ userId: pn.userId, amount: effectiveAmount, currency: 'cfc', sourceType: 'cfc_payment', sourceId: notificationId }).catch(() => {})
          getDiscountSettings()
            .then((d) => {
              if (d.topupBonusEnabled)
                return applyTopupBonus({ userId: pn.userId, amount: effectiveAmount, currency: 'cfc', sourceType: 'cfc_payment', sourceId: notificationId })
            })
            .catch(() => {})

        } else if (pn.productType === AGENCY_JETON_PRODUCT) {
          // Ajans toplu Jeton satın alma: kişisel bakiyeye DEĞİL ajans cüzdanına.
          // İndirim satın alırken uygulandı → seviye bonusu eklenmez.
          const agencyId = agencyIdFromNotes(pn.notes)
          const agency = agencyId
            ? await prisma.agency.findUnique({ where: { id: agencyId }, select: { id: true, ownerId: true, status: true, name: true } })
            : null
          if (!agency || agency.ownerId !== pn.userId || agency.status !== 'approved') {
            throw new Error('AGENCY_INVALID')
          }
          const res = await topUpWallet({
            agencyId: agency.id,
            jetonAmount: effectiveAmount,
            actorId: actor.id,
            actorName: adminUser?.name || 'Admin',
            actorRole: actor.role,
            reason: `Toplu Jeton satın alma (${pn.amount} TL, ${pn.paymentMethod})`,
            idempotencyKey: `payment_notification:${notificationId}`,
            applyLevelBonus: false,
            referenceType: 'payment_notification',
            referenceId: notificationId,
          })
          if (!res.ok) throw new Error('AGENCY_TOPUP_FAILED')
          await prisma.paymentNotification.update({
            where: { id: notificationId },
            data: {
              status: 'approved',
              jetonLoaded: effectiveAmount,
              processedBy: actor.id,
              processedByName: adminUser?.name || 'Admin',
              processedAt: new Date(),
              adminNote: adminNote || null,
              creditApplied: true,
              creditAppliedAt: new Date(),
            },
          })
        } else if (pn.productType === 'gold') {
          const goldDays = pn.requestedGoldDays || 30
          const goldType = pn.requestedGoldType || 'gold'
          const currentExpiry = targetUser.membershipExpiresAt
          const now = new Date()
          const base = (currentExpiry && currentExpiry > now) ? currentExpiry : now
          const newExpiry = new Date(base.getTime() + goldDays * 24 * 60 * 60 * 1000)

          await prisma.$transaction([
            prisma.user.update({
              where: { id: pn.userId },
              data: { membership: goldType, membershipExpiresAt: newExpiry },
            }),
            prisma.paymentNotification.update({
              where: { id: notificationId },
              data: {
                status: 'approved',
                goldDaysLoaded: goldDays,
                goldTypeLoaded: goldType,
                processedBy: actor.id,
                processedByName: adminUser?.name || 'Admin',
                processedAt: new Date(),
                adminNote: adminNote || null,
                creditApplied: true,
                creditAppliedAt: new Date(),
              },
            }),
          ])
        } else {
          return err(`Bilinmeyen ürün tipi: ${pn.productType}`)
        }

        // Notify user
        const productLabel = pn.productType === 'jeton' ? 'Jeton' : pn.productType === 'cfc' ? 'CFC' : pn.productType === AGENCY_JETON_PRODUCT ? 'Ajans Jetonu' : 'Gold'
        createNotificationWithPush({
          userId: pn.userId,
          type: 'payment_approved',
          title: 'Ödeme Onaylandı! ✅',
          message: `${pn.amount} TL ${productLabel} ödemeniz onaylandı. ${effectiveAmount} ${productLabel} hesabınıza eklendi.`,
        }).catch(() => {})

        recordAudit({ actorId: actor.id, action: 'payment_approve', targetType: 'payment_notification', targetId: notificationId, ip, metadata: { productType: pn.productType, amount: effectiveAmount, amountTRY: pn.amount } }).catch(() => {})

        return ok({ success: true, message: `${effectiveAmount} ${productLabel} yüklendi.` })
      }

      /* ============================================================ */
      /*  REJECT                                                       */
      /* ============================================================ */
      case 'reject': {
        if (!(await hasPermission(actor.role, 'payment.reject', actor.id)))
          return err('Ret yetkiniz yok', 403)

        const { notificationId, adminNote } = body
        if (!notificationId) return err('notificationId gerekli')

        const pn = await prisma.paymentNotification.findUnique({ where: { id: notificationId } })
        if (!pn) return err('Bulunamadı', 404)
        if (!canTransition(pn.status, 'rejected'))
          return err(`Bu bildirim "${pn.status}" durumunda, reddedilemez`)

        const adminUser = await prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } })

        // Koşullu geçiş: onay bakiyeyi sahiplendiyse (creditApplied) veya durum
        // değiştiyse bu işlem uygulanmaz → onay ile rejected aynı anda kazanamaz.
        const moved = await prisma.paymentNotification.updateMany({
          where: { id: notificationId, status: pn.status, creditApplied: false },
          data: {
            status: 'rejected',
            processedBy: actor.id,
            processedByName: adminUser?.name || 'Admin',
            processedAt: new Date(),
            adminNote: adminNote || null,
          },
        })
        if (moved.count !== 1) return err('Bildirim bu sırada başka bir işlemle güncellendi; listeyi yenileyin', 409)

        createNotificationWithPush({
          userId: pn.userId,
          type: 'payment_rejected',
          title: 'Ödeme Reddedildi ❌',
          message: `${pn.amount} TL ödeme bildiriminiz reddedildi.${adminNote ? ' Sebep: ' + adminNote : ''}`,
        }).catch(() => {})

        recordAudit({ actorId: actor.id, action: 'payment_reject', targetType: 'payment_notification', targetId: notificationId, ip, metadata: { amountTRY: pn.amount, reason: adminNote } }).catch(() => {})

        return ok({ success: true, message: 'Ödeme reddedildi.' })
      }

      /* ============================================================ */
      /*  CORRECT (admin corrects amount before final approval)         */
      /* ============================================================ */
      case 'correct': {
        if (!(await hasPermission(actor.role, 'payment.correct', actor.id)))
          return err('Düzeltme yetkiniz yok', 403)

        const { notificationId, correctedAmount, correctionReason } = body
        if (!notificationId) return err('notificationId gerekli')
        if (!correctedAmount || correctedAmount < 1) return err('Düzeltilmiş miktar gerekli')
        if (!correctionReason) return err('Düzeltme sebebi gerekli')

        const pn = await prisma.paymentNotification.findUnique({ where: { id: notificationId } })
        if (!pn) return err('Bulunamadı', 404)
        if (!canTransition(pn.status, 'corrected'))
          return err(`Bu bildirim "${pn.status}" durumunda, düzeltilemez`)

        await prisma.paymentNotification.update({
          where: { id: notificationId },
          data: {
            status: 'corrected',
            originalRequestedAmount: pn.requestedAmount,
            correctedAmount: parseInt(correctedAmount),
            correctedBy: actor.id,
            correctedAt: new Date(),
            correctionReason,
          },
        })

        recordAudit({ actorId: actor.id, action: 'payment_correct', targetType: 'payment_notification', targetId: notificationId, ip, metadata: { originalAmount: pn.requestedAmount, correctedAmount, reason: correctionReason } }).catch(() => {})

        return ok({ success: true, message: `Miktar ${correctedAmount} olarak düzeltildi, onay bekliyor.` })
      }

      /* ============================================================ */
      /*  CANCEL                                                       */
      /* ============================================================ */
      case 'cancel': {
        if (!(await hasPermission(actor.role, 'payment.reject', actor.id)))
          return err('İptal yetkiniz yok', 403)

        const { notificationId, adminNote } = body
        if (!notificationId) return err('notificationId gerekli')

        const pn = await prisma.paymentNotification.findUnique({ where: { id: notificationId } })
        if (!pn) return err('Bulunamadı', 404)
        if (!canTransition(pn.status, 'cancelled'))
          return err(`Bu bildirim "${pn.status}" durumunda, iptal edilemez`)

        const adminUser = await prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } })

        // Koşullu geçiş: onay bakiyeyi sahiplendiyse (creditApplied) veya durum
        // değiştiyse bu işlem uygulanmaz → onay ile cancelled aynı anda kazanamaz.
        const moved = await prisma.paymentNotification.updateMany({
          where: { id: notificationId, status: pn.status, creditApplied: false },
          data: {
            status: 'cancelled',
            processedBy: actor.id,
            processedByName: adminUser?.name || 'Admin',
            processedAt: new Date(),
            adminNote: adminNote || null,
          },
        })
        if (moved.count !== 1) return err('Bildirim bu sırada başka bir işlemle güncellendi; listeyi yenileyin', 409)

        recordAudit({ actorId: actor.id, action: 'payment_cancel', targetType: 'payment_notification', targetId: notificationId, ip, metadata: { amountTRY: pn.amount } }).catch(() => {})

        return ok({ success: true, message: 'Ödeme iptal edildi.' })
      }

      /* ============================================================ */
      /*  REFUND (reverse an already-approved payment)                  */
      /* ============================================================ */
      case 'refund': {
        if (!(await hasPermission(actor.role, 'payment.refund', actor.id)))
          return err('İade yetkiniz yok', 403)

        const { notificationId, adminNote } = body
        if (!notificationId) return err('notificationId gerekli')

        const pn = await prisma.paymentNotification.findUnique({ where: { id: notificationId } })
        if (!pn) return err('Bulunamadı', 404)
        if (!canTransition(pn.status, 'refunded'))
          return err(`Bu bildirim "${pn.status}" durumunda, iade edilemez`)
        if (!pn.creditApplied)
          return err('Bakiye yüklenmemiş, iade gerekmez')

        const adminUser = await prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } })

        // Yarış koruması: durum geçişi koşullu (approved → refunded, tek kez);
        // bakiye mutlak değerle değil, işlem İÇİNDE okunan değerden koşullu düşümle.
        // Kullanıcı yüklenen Jetonu kısmen harcadıysa en fazla kalan bakiye kadar düşülür
        // (önceki davranış: Math.max(0, …)).
        let refunded: { kind: 'jeton' | 'cfc' | null; amount: number; before: number; after: number }
        try {
          refunded = await prisma.$transaction(async (tx: any) => {
            const claimed = await tx.paymentNotification.updateMany({
              where: { id: notificationId, status: 'approved', creditApplied: true },
              data: {
                status: 'refunded',
                processedBy: actor.id,
                processedByName: adminUser?.name || 'Admin',
                processedAt: new Date(),
                adminNote: adminNote ? `[İade] ${adminNote}` : '[İade]',
              },
            })
            if (claimed.count !== 1) throw new Error('REFUND_CONFLICT')

            const field = pn.productType === 'jeton' && pn.jetonLoaded ? 'jetonBalance'
              : pn.productType === 'cfc' && pn.cfcLoaded ? 'cfcBalance' : null
            if (!field) return { kind: null as 'jeton' | 'cfc' | null, amount: 0, before: 0, after: 0 }
            const loaded = field === 'jetonBalance' ? pn.jetonLoaded! : pn.cfcLoaded!
            const cur = await tx.user.findUnique({ where: { id: pn.userId }, select: { [field]: true } })
            if (!cur) throw new Error('USER_NOT_FOUND')
            const balance = Number((cur as any)[field] || 0)
            const deduct = Math.min(balance, loaded)
            if (deduct > 0) {
              const dec = await tx.user.updateMany({
                where: { id: pn.userId, [field]: { gte: deduct } },
                data: { [field]: { decrement: deduct } },
              })
              if (dec.count !== 1) throw new Error('REFUND_CONFLICT')
            }
            const after = balance - deduct
            if (field === 'jetonBalance') {
              await tx.jetonTransaction.create({
                data: {
                  userId: pn.userId,
                  amount: -deduct,
                  type: 'admin_refund',
                  description: `Ödeme iadesi - Ref: ${notificationId.slice(-8)}${deduct < loaded ? ` (yüklenen ${loaded}, kalan bakiye kadar düşüldü)` : ''}`,
                  balanceBefore: balance,
                  balanceAfter: after,
                },
              })
            }
            return { kind: (field === 'jetonBalance' ? 'jeton' : 'cfc') as 'jeton' | 'cfc' | null, amount: deduct, before: balance, after }
          })
        } catch (e: any) {
          if (e?.message === 'REFUND_CONFLICT') return err('Bildirim aynı anda başka bir işlemle değişti; sayfayı yenileyip tekrar deneyin', 409)
          if (e?.message === 'USER_NOT_FOUND') return err('Kullanıcı bulunamadı', 404)
          throw e
        }

        if (refunded.kind && refunded.amount > 0) {
          recordLedger({
            debit: { accountType: refunded.kind === 'jeton' ? 'user_jeton' : 'user_cfc', accountId: pn.userId },
            credit: { accountType: refunded.kind === 'jeton' ? 'platform_jeton' : 'platform_cfc', accountId: 'platform' },
            amount: refunded.amount,
            category: 'refund',
            currency: refunded.kind,
            description: refunded.kind === 'jeton' ? 'Ödeme iadesi' : 'CFC ödeme iadesi',
            referenceType: 'payment_notification',
            referenceId: notificationId,
          }).catch(() => {})
        }
        // Gold iadesi: yalnız durum işaretlenir; üyeliği admin elle geri alır.

        createNotificationWithPush({
          userId: pn.userId,
          type: 'payment_refunded',
          title: 'Ödeme İade Edildi 🔄',
          message: `${pn.amount} TL ödemeniz iade edildi.${adminNote ? ' Not: ' + adminNote : ''}`,
        }).catch(() => {})

        recordAudit({ actorId: actor.id, action: 'payment_refund', targetType: 'payment_notification', targetId: notificationId, ip, metadata: { productType: pn.productType, amountTRY: pn.amount } }).catch(() => {})

        return ok({ success: true, message: 'Ödeme iade edildi.' })
      }

      /* ============================================================ */
      /*  MANUAL_LOAD — load jeton/cfc without a payment notification   */
      /* ============================================================ */
      case 'manual_load': {
        const { userId: targetUserId, productType, amount: rawAmount, reason } = body
        if (!targetUserId) return err('userId gerekli')
        if (!productType || !['jeton', 'cfc'].includes(productType)) return err('productType jeton veya cfc olmalı')
        // §18 — Manuel Jeton/CFC EKLEME ve ÇIKARMA (negatif değer = düşme)
        const amount = Math.trunc(Number(rawAmount) || 0)
        if (amount === 0) return err('Miktar 0 olamaz (pozitif = ekle, negatif = çıkar)')

        // Permission based on product type
        const permKey = productType === 'jeton' ? 'finance.jeton.adjust' : 'finance.cfc.adjust'
        if (!(await hasPermission(actor.role, permKey, actor.id)))
          return err('Bu işlem için yetkiniz yok', 403)

        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { jetonBalance: true, cfcBalance: true, username: true, name: true },
        })
        if (!targetUser) return err('Kullanıcı bulunamadı', 404)

        // Bakiye mutlak değerle yazılmaz: artış increment, düşüm koşullu decrement
        // (bakiye yetmezse işlem reddedilir). Önce/sonra değerler işlem içinde okunur.
        const field = productType === 'jeton' ? 'jetonBalance' : 'cfcBalance'
        const unit = productType === 'jeton' ? 'jeton' : 'CFC'
        let before = 0
        let after = 0
        try {
          const res = await prisma.$transaction(async (tx: any) => {
            if (amount > 0) {
              await tx.user.update({ where: { id: targetUserId }, data: { [field]: { increment: amount } } })
            } else {
              const dec = await tx.user.updateMany({
                where: { id: targetUserId, [field]: { gte: -amount } },
                data: { [field]: { decrement: -amount } },
              })
              if (dec.count !== 1) throw new Error('INSUFFICIENT')
            }
            const cur = await tx.user.findUnique({ where: { id: targetUserId }, select: { [field]: true } })
            const a2 = Number((cur as any)?.[field] || 0)
            const b2 = a2 - amount
            if (productType === 'jeton') {
              await tx.jetonTransaction.create({
                data: {
                  userId: targetUserId,
                  amount,
                  type: amount > 0 ? 'admin_load' : 'admin_deduct',
                  description: reason || `Admin tarafından yüklendi`,
                  balanceBefore: b2,
                  balanceAfter: a2,
                },
              })
            }
            return { b2, a2 }
          })
          before = res.b2
          after = res.a2
        } catch (e: any) {
          if (e?.message === 'INSUFFICIENT') {
            return err(`Yetersiz bakiye: kullanıcıda ${Number((targetUser as any)[field] || 0)} ${unit} var`)
          }
          throw e
        }
        recordLedger({
          debit: { accountType: productType === 'jeton' ? 'platform_jeton' : 'platform_cfc', accountId: 'platform' },
          credit: { accountType: productType === 'jeton' ? 'user_jeton' : 'user_cfc', accountId: targetUserId, balanceBefore: before, balanceAfter: after },
          amount: Math.abs(amount),
          category: 'admin_adjust',
          currency: productType === 'jeton' ? 'jeton' : 'cfc',
          description: reason || (productType === 'jeton' ? 'Admin manual jeton load' : 'Admin manual CFC load'),
          referenceType: 'admin_manual',
        }).catch(() => {})

        createNotificationWithPush({
          userId: targetUserId,
          type: productType === 'jeton' ? 'jeton_added' : 'cfc_added',
          title: amount > 0
            ? (productType === 'jeton' ? 'Jeton Eklendi! 🪙' : 'CFC Eklendi! 💎')
            : (productType === 'jeton' ? 'Jeton Düşüldü' : 'CFC Düşüldü'),
          message: amount > 0
            ? `Hesabınıza ${amount} ${productType === 'jeton' ? 'jeton' : 'CFC'} eklendi.`
            : `Hesabınızdan ${Math.abs(amount)} ${productType === 'jeton' ? 'jeton' : 'CFC'} düşüldü.`,
        }).catch(() => {})

        recordAudit({ actorId: actor.id, action: 'manual_balance_load', targetType: 'user', targetId: targetUserId, ip, metadata: { productType, amount, reason } }).catch(() => {})

        return ok({ success: true, message: `${targetUser.username || targetUser.name} kullanıcısı için ${Math.abs(amount)} ${productType} ${amount > 0 ? 'yüklendi' : 'düşüldü'}.` })
      }

      default:
        return err(`Bilinmeyen action: ${action}`)
    }
  } catch (error) {
    console.error('Admin POST payments error:', error)
    // Kilit alındı ama işlem tamamlanamadıysa serbest bırak — tekrar denenebilsin.
    if (claimedNotificationId) {
      await prisma.paymentNotification
        .updateMany({
          where: { id: claimedNotificationId, status: { not: 'approved' } },
          data: { creditApplied: false, creditAppliedAt: null },
        })
        .catch(() => {})
    }
    return err('Bir hata oluştu', 500)
  }
}
