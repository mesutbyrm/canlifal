export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { recordLedger } from '@/lib/ledger'
import { recordAudit } from '@/lib/audit-log'
import { getCachedPlatformSetting } from '@/lib/cache'
import {
  verifyGooglePlayPurchase,
  acknowledgeGooglePlayPurchase,
  isPlayBillingConfigured,
} from '@/lib/store-billing'

/**
 * POST /api/billing/google-play/verify
 * Body: { productId, purchaseToken, type?: 'product'|'subscription' }
 *
 * Flutter satın alma doğrulaması. İstemci ASLA tutar/bakiye bildirmez;
 * ne verileceği sunucudaki `store_products_map` ayarından okunur.
 *
 * Güvenlik:
 *  - purchaseToken (provider, purchaseToken) UNIQUE → aynı token iki kez
 *    işlenemez (replay / duplicate koruması).
 *  - Doğrulama başarısızsa HİÇBİR bakiye yüklenmez.
 *  - Her yükleme ledger'a yazılır ve audit kaydı oluşur.
 *
 * `store_products_map` örneği (admin ayarları):
 * {"jeton_100":{"type":"jeton","amount":100},
 *  "cfc_500":{"type":"cfc","amount":500},
 *  "gold_30":{"type":"membership","plan":"gold","days":30}}
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const productId = typeof body?.productId === 'string' ? body.productId.trim() : ''
    const purchaseToken = typeof body?.purchaseToken === 'string' ? body.purchaseToken.trim() : ''
    const type: 'product' | 'subscription' = body?.type === 'subscription' ? 'subscription' : 'product'

    if (!productId || !purchaseToken) {
      return NextResponse.json(
        { error: 'productId ve purchaseToken zorunludur', code: 'VALIDATION_ERROR' },
        { status: 422 }
      )
    }

    if (!isPlayBillingConfigured()) {
      return NextResponse.json(
        {
          error: 'Mağaza içi satın alma doğrulaması henüz yapılandırılmamış.',
          code: 'SERVICE_UNAVAILABLE',
          detail: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ve GOOGLE_PLAY_PACKAGE_NAME tanımlanmalı.',
        },
        { status: 503 }
      )
    }

    // ── Idempotency: aynı purchaseToken daha önce işlendiyse aynı sonucu dön ──
    const existing = await prisma.storePurchase.findUnique({
      where: { provider_purchaseToken: { provider: 'google_play', purchaseToken } },
    })
    if (existing) {
      if (existing.userId !== authUser.id) {
        return NextResponse.json(
          { error: 'Bu satın alma başka bir hesapta kullanılmış.', code: 'CONFLICT' },
          { status: 409 }
        )
      }
      return NextResponse.json({
        success: existing.status === 'granted',
        alreadyProcessed: true,
        data: {
          status: existing.status,
          grantedType: existing.grantedType,
          grantedAmount: existing.grantedAmount,
        },
      })
    }

    // Kayıt aç (pending) — UNIQUE ihlali eşzamanlı isteği engeller
    let purchase
    try {
      purchase = await prisma.storePurchase.create({
        data: { userId: authUser.id, provider: 'google_play', productId, purchaseToken, status: 'pending' },
      })
    } catch {
      return NextResponse.json(
        { error: 'Bu satın alma şu anda işleniyor.', code: 'IDEMPOTENCY_CONFLICT' },
        { status: 409 }
      )
    }

    // ── Google doğrulaması ──
    const result = await verifyGooglePlayPurchase(productId, purchaseToken, type)
    if (!result.ok) {
      const failReason = (result as { reason?: string }).reason || 'unknown'
      await prisma.storePurchase.update({
        where: { id: purchase.id },
        data: { status: 'failed', failureReason: failReason },
      })
      return NextResponse.json(
        { error: 'Satın alma doğrulanamadı', code: 'PAYMENT_FAILED', reason: failReason },
        { status: 402 }
      )
    }
    if (result.purchaseState !== 0) {
      await prisma.storePurchase.update({
        where: { id: purchase.id },
        data: { status: 'failed', failureReason: `purchaseState=${result.purchaseState}`, rawResponse: result.raw },
      })
      return NextResponse.json(
        { error: 'Satın alma tamamlanmamış veya iptal edilmiş', code: 'PAYMENT_FAILED' },
        { status: 402 }
      )
    }

    await prisma.storePurchase.update({
      where: { id: purchase.id },
      data: { status: 'verified', verifiedAt: new Date(), orderId: result.orderId ?? null, rawResponse: result.raw },
    })

    // ── Ürün eşlemesi (sunucu tarafı — istemci tutar belirleyemez) ──
    const mapRaw = await getCachedPlatformSetting('store_products_map', '{}')
    let map: Record<string, any> = {}
    try { map = JSON.parse(mapRaw) } catch { map = {} }
    const entry = map[productId]
    if (!entry || typeof entry !== 'object') {
      await prisma.storePurchase.update({
        where: { id: purchase.id },
        data: { status: 'failed', failureReason: 'product_not_mapped' },
      })
      return NextResponse.json(
        { error: 'Ürün tanımlı değil. Lütfen destek ile iletişime geçin.', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const grantType = String(entry.type || '')
    const amount = Number.isFinite(Number(entry.amount)) ? Math.max(0, Math.floor(Number(entry.amount))) : 0

    let grantedAmount = 0
    let ledgerTxId: string | null = null

    if (grantType === 'jeton' || grantType === 'cfc') {
      if (amount <= 0) {
        await prisma.storePurchase.update({
          where: { id: purchase.id },
          data: { status: 'failed', failureReason: 'invalid_amount' },
        })
        return NextResponse.json({ error: 'Geçersiz ürün tanımı', code: 'VALIDATION_ERROR' }, { status: 422 })
      }
      const updated = await prisma.$transaction(async (tx: any) => {
        const before = await tx.user.findUnique({
          where: { id: authUser.id },
          select: { jetonBalance: true, credits: true },
        })
        const after = await tx.user.update({
          where: { id: authUser.id },
          data: grantType === 'jeton'
            ? { jetonBalance: { increment: amount } }
            : { credits: { increment: amount } },
          select: { jetonBalance: true, credits: true },
        })
        return { before, after }
      })
      grantedAmount = amount

      try {
        const tx = await recordLedger({
          debit: { accountType: grantType === 'jeton' ? 'platform_jeton' : 'platform_cfc', accountId: 'platform' },
          credit: {
            accountType: grantType === 'jeton' ? 'user_jeton' : 'user_cfc',
            accountId: authUser.id,
            balanceBefore: grantType === 'jeton' ? updated.before?.jetonBalance : updated.before?.credits,
            balanceAfter: grantType === 'jeton' ? updated.after?.jetonBalance : updated.after?.credits,
          },
          amount,
          category: 'purchase',
          currency: grantType === 'jeton' ? 'jeton' : 'cfc',
          description: `Google Play satın alma: ${productId}`,
          referenceType: 'StorePurchase',
          referenceId: purchase.id,
          metadata: { provider: 'google_play', orderId: result.orderId },
        })
        ledgerTxId = (tx as any)?.transactionId ?? (tx as any)?.id ?? null
      } catch (e) {
        console.error('Ledger write failed for store purchase', e)
      }
    } else if (grantType === 'membership') {
      const days = Number.isFinite(Number(entry.days)) ? Math.max(1, Math.floor(Number(entry.days))) : 30
      const plan = String(entry.plan || 'gold')
      const current = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { membershipExpiresAt: true },
      })
      const base =
        current?.membershipExpiresAt && current.membershipExpiresAt > new Date()
          ? current.membershipExpiresAt
          : new Date()
      const expires = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
      await prisma.user.update({
        where: { id: authUser.id },
        data: { membership: plan, membershipExpiresAt: expires },
      })
      grantedAmount = days
    } else {
      await prisma.storePurchase.update({
        where: { id: purchase.id },
        data: { status: 'failed', failureReason: 'unknown_grant_type' },
      })
      return NextResponse.json({ error: 'Geçersiz ürün tipi', code: 'VALIDATION_ERROR' }, { status: 422 })
    }

    await prisma.storePurchase.update({
      where: { id: purchase.id },
      data: {
        status: 'granted',
        grantedType: grantType,
        grantedAmount,
        ledgerTxId,
        grantedAt: new Date(),
      },
    })

    // Play tarafında onayla — yapılmazsa Google 3 gün sonra iade eder.
    if (!result.acknowledged) {
      acknowledgeGooglePlayPurchase(productId, purchaseToken, type).catch(() => {})
    }

    await recordAudit({
      actorId: authUser.id,
      action: 'billing.google_play_granted',
      targetType: 'StorePurchase',
      targetId: purchase.id,
      description: `Google Play satın alma işlendi: ${productId}`,
      metadata: { grantType, grantedAmount, orderId: result.orderId },
    })

    return NextResponse.json({
      success: true,
      data: { purchaseId: purchase.id, grantedType: grantType, grantedAmount, status: 'granted' },
    })
  } catch (error) {
    console.error('Google Play verify error:', error)
    return NextResponse.json({ error: 'Satın alma işlenemedi', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
