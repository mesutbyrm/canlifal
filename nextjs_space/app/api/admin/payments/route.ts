import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'
import { hasPermission } from '@/lib/permissions'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { recordLedger } from '@/lib/ledger'
import { createNotificationWithPush } from '@/lib/notify'
import { awardTopupCommissions } from '@/lib/referral-commission'
import { applyTopupBonus } from '@/lib/currency-branding'

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
      return ok({
        counts: { pending, approved, rejected, corrected, cancelled },
        totals: {
          amountTRY: aggs._sum.amount || 0,
          jetonLoaded: aggs._sum.jetonLoaded || 0,
          cfcLoaded: aggs._sum.cfcLoaded || 0,
          goldDaysLoaded: aggs._sum.goldDaysLoaded || 0,
        },
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
      return ok({ notification: pn, user })
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

    return ok({ notifications, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin GET payments error:', error)
    return err('Bir hata oluştu', 500)
  }
}

/* ------------------------------------------------------------------ */
/*  POST — all payment admin actions                                   */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const actor = await resolveUser(req)
    if (!actor) return err('Oturum açmanız gerekiyor', 401)
    if (!isAdminRole(actor.role)) return err('Erişim reddedildi', 403)

    const body = await req.json()
    const { action } = body
    if (!action) return err('action gerekli')
    const ip = getAuditIp(req)

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

        // Determine amount to load
        const effectiveAmount = loadAmount
          ? Math.max(1, parseInt(loadAmount))
          : (pn.correctedAmount || pn.requestedAmount || 0)
        if (effectiveAmount < 1) return err('Yüklenecek miktar belirtilmeli')

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
            prisma.user.update({ where: { id: pn.userId }, data: { jetonBalance: after } }),
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
          applyTopupBonus({ userId: pn.userId, amount: effectiveAmount, currency: 'jeton', sourceType: 'jeton_payment', sourceId: notificationId }).catch(() => {})

        } else if (pn.productType === 'cfc') {
          const before = targetUser.cfcBalance || 0
          const after = before + effectiveAmount

          await prisma.$transaction([
            prisma.user.update({ where: { id: pn.userId }, data: { cfcBalance: after } }),
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
          applyTopupBonus({ userId: pn.userId, amount: effectiveAmount, currency: 'cfc', sourceType: 'cfc_payment', sourceId: notificationId }).catch(() => {})

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
        const productLabel = pn.productType === 'jeton' ? 'Jeton' : pn.productType === 'cfc' ? 'CFC' : 'Gold'
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

        await prisma.paymentNotification.update({
          where: { id: notificationId },
          data: {
            status: 'rejected',
            processedBy: actor.id,
            processedByName: adminUser?.name || 'Admin',
            processedAt: new Date(),
            adminNote: adminNote || null,
          },
        })

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

        await prisma.paymentNotification.update({
          where: { id: notificationId },
          data: {
            status: 'cancelled',
            processedBy: actor.id,
            processedByName: adminUser?.name || 'Admin',
            processedAt: new Date(),
            adminNote: adminNote || null,
          },
        })

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

        const targetUser = await prisma.user.findUnique({
          where: { id: pn.userId },
          select: { jetonBalance: true, cfcBalance: true, membership: true },
        })
        if (!targetUser) return err('Kullanıcı bulunamadı', 404)

        const adminUser = await prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } })
        const ops: any[] = []

        if (pn.productType === 'jeton' && pn.jetonLoaded) {
          const before = targetUser.jetonBalance || 0
          const after = Math.max(0, before - pn.jetonLoaded)
          ops.push(
            prisma.user.update({ where: { id: pn.userId }, data: { jetonBalance: after } }),
            prisma.jetonTransaction.create({
              data: {
                userId: pn.userId,
                amount: -pn.jetonLoaded,
                type: 'admin_refund',
                description: `Ödeme iadesi - Ref: ${notificationId.slice(-8)}`,
                balanceBefore: before,
                balanceAfter: after,
              },
            }),
          )
          recordLedger({
            debit: { accountType: 'user_jeton', accountId: pn.userId },
            credit: { accountType: 'platform_jeton', accountId: 'platform' },
            amount: pn.jetonLoaded,
            category: 'refund',
            currency: 'jeton',
            description: `Ödeme iadesi`,
            referenceType: 'payment_notification',
            referenceId: notificationId,
          }).catch(() => {})
        } else if (pn.productType === 'cfc' && pn.cfcLoaded) {
          const before = targetUser.cfcBalance || 0
          const after = Math.max(0, before - pn.cfcLoaded)
          ops.push(
            prisma.user.update({ where: { id: pn.userId }, data: { cfcBalance: after } }),
          )
          recordLedger({
            debit: { accountType: 'user_cfc', accountId: pn.userId },
            credit: { accountType: 'platform_cfc', accountId: 'platform' },
            amount: pn.cfcLoaded,
            category: 'refund',
            currency: 'cfc',
            description: `CFC ödeme iadesi`,
            referenceType: 'payment_notification',
            referenceId: notificationId,
          }).catch(() => {})
        }
        // Gold refund: just mark refunded; admin manually revokes gold if needed

        ops.push(
          prisma.paymentNotification.update({
            where: { id: notificationId },
            data: {
              status: 'refunded',
              processedBy: actor.id,
              processedByName: adminUser?.name || 'Admin',
              processedAt: new Date(),
              adminNote: adminNote ? `[İade] ${adminNote}` : '[İade]',
            },
          }),
        )

        await prisma.$transaction(ops)

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
        const amount = Math.max(1, parseInt(rawAmount) || 0)
        if (amount < 1) return err('Miktar en az 1 olmalı')

        // Permission based on product type
        const permKey = productType === 'jeton' ? 'finance.jeton.adjust' : 'finance.cfc.adjust'
        if (!(await hasPermission(actor.role, permKey, actor.id)))
          return err('Bu işlem için yetkiniz yok', 403)

        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { jetonBalance: true, cfcBalance: true, username: true, name: true },
        })
        if (!targetUser) return err('Kullanıcı bulunamadı', 404)

        if (productType === 'jeton') {
          const before = targetUser.jetonBalance || 0
          const after = before + amount
          await prisma.$transaction([
            prisma.user.update({ where: { id: targetUserId }, data: { jetonBalance: after } }),
            prisma.jetonTransaction.create({
              data: {
                userId: targetUserId,
                amount,
                type: 'admin_load',
                description: reason || `Admin tarafından yüklendi`,
                balanceBefore: before,
                balanceAfter: after,
              },
            }),
          ])
          recordLedger({
            debit: { accountType: 'platform_jeton', accountId: 'platform' },
            credit: { accountType: 'user_jeton', accountId: targetUserId, balanceBefore: before, balanceAfter: after },
            amount,
            category: 'admin_adjust',
            currency: 'jeton',
            description: reason || 'Admin manual jeton load',
            referenceType: 'admin_manual',
          }).catch(() => {})
        } else {
          const before = targetUser.cfcBalance || 0
          const after = before + amount
          await prisma.$transaction([
            prisma.user.update({ where: { id: targetUserId }, data: { cfcBalance: after } }),
          ])
          recordLedger({
            debit: { accountType: 'platform_cfc', accountId: 'platform' },
            credit: { accountType: 'user_cfc', accountId: targetUserId, balanceBefore: before, balanceAfter: after },
            amount,
            category: 'admin_adjust',
            currency: 'cfc',
            description: reason || 'Admin manual CFC load',
            referenceType: 'admin_manual',
          }).catch(() => {})
        }

        createNotificationWithPush({
          userId: targetUserId,
          type: productType === 'jeton' ? 'jeton_added' : 'cfc_added',
          title: productType === 'jeton' ? 'Jeton Eklendi! 🪙' : 'CFC Eklendi! 💎',
          message: `Hesabınıza ${amount} ${productType === 'jeton' ? 'jeton' : 'CFC'} eklendi.`,
        }).catch(() => {})

        recordAudit({ actorId: actor.id, action: 'manual_balance_load', targetType: 'user', targetId: targetUserId, ip, metadata: { productType, amount, reason } }).catch(() => {})

        return ok({ success: true, message: `${targetUser.username || targetUser.name} kullanıcısına ${amount} ${productType} yüklendi.` })
      }

      default:
        return err(`Bilinmeyen action: ${action}`)
    }
  } catch (error) {
    console.error('Admin POST payments error:', error)
    return err('Bir hata oluştu', 500)
  }
}
