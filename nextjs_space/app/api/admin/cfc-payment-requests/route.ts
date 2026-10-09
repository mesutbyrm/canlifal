import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'
import { hasPermission } from '@/lib/permissions'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { createNotificationWithPush } from '@/lib/notify'
import { awardTopupCommissions } from '@/lib/referral-commission'
import { applyTopupBonus } from '@/lib/currency-branding'

export const dynamic = 'force-dynamic'

// GET - List all CFC payment requests (admin)
export async function GET(request: NextRequest) {
  try {
    const actor = await resolveUser(request)
    if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    if (!(await hasPermission(actor.role, 'payment.view', actor.id)))
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (status !== 'all') {
      where.status = status
    }

    const [requests, total] = await Promise.all([
      prisma.cfcPaymentRequest.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, username: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cfcPaymentRequest.count({ where }),
    ])

    return NextResponse.json({
      requests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching CFC payment requests:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH - Approve or reject a CFC payment request
export async function PATCH(request: NextRequest) {
  try {
    const actor = await resolveUser(request)
    if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })

    const body = await request.json()
    const { requestId, action, reviewNote } = body

    if (!requestId || !['approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
    }

    // Permission check
    const permKey = action === 'approve' ? 'payment.approve' : 'payment.reject' // iptal = ret yetkisi
    if (!(await hasPermission(actor.role, permKey, actor.id)))
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })

    const paymentRequest = await prisma.cfcPaymentRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, name: true, cfcBalance: true } } },
    })

    if (!paymentRequest) {
      return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 })
    }

    if (paymentRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Bu talep zaten işlenmiş' }, { status: 400 })
    }

    const ip = getAuditIp(request)

    const conflict = () => NextResponse.json(
      { error: 'Talep bu sırada başka bir işlemle güncellendi; listeyi yenileyin' },
      { status: 409 },
    )

    if (action === 'approve') {
      // Koşullu geçiş: aynı anda iki onay (veya onay + iptal) gelirse yalnızca
      // biri kazanır; CFC bir kez yüklenir.
      const updatedRequest = await prisma.$transaction(async (tx: any) => {
        const moved = await tx.cfcPaymentRequest.updateMany({
          where: { id: requestId, status: 'pending' },
          data: {
            status: 'approved',
            reviewedBy: actor.id,
            reviewNote: reviewNote || null,
          },
        })
        if (moved.count !== 1) return null
        await tx.user.update({
          where: { id: paymentRequest.userId },
          data: {
            cfcBalance: { increment: paymentRequest.amount },
          },
        })
        return tx.cfcPaymentRequest.findUnique({ where: { id: requestId } })
      })
      if (!updatedRequest) return conflict()

      createNotificationWithPush({
        userId: paymentRequest.userId,
        type: 'cfc_payment_approved',
        title: '✅ CFC Yükleme Onaylandı',
        message: `${paymentRequest.amount} CFC hesabınıza yüklendi! Yeni bakiyeniz: ${(paymentRequest.user.cfcBalance || 0) + paymentRequest.amount} CFC`,
        data: JSON.stringify({ amount: paymentRequest.amount, requestId }),
        targetPath: '/cfc-store',
        targetId: requestId,
        urgent: true,
      }).catch(err => console.error('CFC approve push error:', err))

      if (paymentRequest.amount > 0) {
        applyTopupBonus({
          userId: paymentRequest.userId,
          amount: paymentRequest.amount,
          currency: 'cfc',
          sourceType: 'cfc_payment',
          sourceId: requestId,
        }).catch(err => console.error('[TopupBonus] cfc approve error:', err))
      }

      if (paymentRequest.amount > 0) {
        awardTopupCommissions({
          userId: paymentRequest.userId,
          amount: paymentRequest.amount,
          currency: 'cfc',
          sourceType: 'cfc_payment',
          sourceId: requestId,
        }).catch(err => console.error('[Commission] cfc approve error:', err))
      }

      recordAudit({ actorId: actor.id, action: 'cfc_payment_approve', targetType: 'cfc_payment_request', targetId: requestId, ip, metadata: { amount: paymentRequest.amount, userId: paymentRequest.userId } }).catch(() => {})

      return NextResponse.json(updatedRequest)
    } else if (action === 'cancel') {
      // Yönetici iptali — yalnızca bekleyen talep; CFC yüklenmemiştir, bakiye hareketi yok.
      const moved = await prisma.cfcPaymentRequest.updateMany({
        where: { id: requestId, status: 'pending' },
        data: {
          status: 'cancelled',
          reviewedBy: actor.id,
          reviewNote: `[İptal — yönetici] ${reviewNote || 'Gerekçe belirtilmedi'}`,
        },
      })
      if (moved.count !== 1) return conflict()

      createNotificationWithPush({
        userId: paymentRequest.userId,
        type: 'cfc_payment_cancelled',
        title: 'CFC Yükleme Talebiniz İptal Edildi',
        message: `${paymentRequest.amount} CFC yükleme talebiniz iptal edildi.${reviewNote ? ' Sebep: ' + reviewNote : ''}`,
        targetPath: '/cfc-store',
        targetId: requestId,
      }).catch(err => console.error('CFC cancel push error:', err))

      recordAudit({ actorId: actor.id, action: 'cfc_payment_cancel', targetType: 'cfc_payment_request', targetId: requestId, ip, metadata: { amount: paymentRequest.amount, userId: paymentRequest.userId, reason: reviewNote } }).catch(() => {})

      return NextResponse.json(await prisma.cfcPaymentRequest.findUnique({ where: { id: requestId } }))
    } else {
      const moved = await prisma.cfcPaymentRequest.updateMany({
        where: { id: requestId, status: 'pending' },
        data: {
          status: 'rejected',
          reviewedBy: actor.id,
          reviewNote: reviewNote || null,
        },
      })
      if (moved.count !== 1) return conflict()
      const updatedRequest = await prisma.cfcPaymentRequest.findUnique({ where: { id: requestId } })

      createNotificationWithPush({
        userId: paymentRequest.userId,
        type: 'cfc_payment_rejected',
        title: '❌ CFC Yükleme Reddedildi',
        message: `${paymentRequest.amount} CFC yükleme talebiniz reddedildi.${reviewNote ? ' Sebep: ' + reviewNote : ''}`,
        data: JSON.stringify({ amount: paymentRequest.amount, requestId }),
        targetPath: '/cfc-store',
        targetId: requestId,
        urgent: true,
      }).catch(err => console.error('CFC reject push error:', err))

      recordAudit({ actorId: actor.id, action: 'cfc_payment_reject', targetType: 'cfc_payment_request', targetId: requestId, ip, metadata: { amount: paymentRequest.amount, userId: paymentRequest.userId, reason: reviewNote } }).catch(() => {})

      return NextResponse.json(updatedRequest)
    }
  } catch (error) {
    console.error('Error processing CFC payment request:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
