export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { verifyAppleReceipt, isAppleBillingConfigured } from '@/lib/apple-billing'
import { grantMappedPurchase } from '@/lib/store-grant'

/**
 * POST /api/billing/app-store/verify
 * Body: { productId, receiptData }  (receiptData = base64 App Store makbuzu)
 *
 * Flutter (iOS) satın alma doğrulaması. İstemci ASLA tutar/bakiye bildirmez;
 * ne verileceği sunucudaki `store_products_map` ayarından okunur (Google Play ile ortak).
 *
 * Güvenlik:
 *  - (provider='app_store', purchaseToken=transactionId) UNIQUE → replay/duplicate koruması.
 *  - Makbuz doğrulanamazsa HİÇBİR bakiye yüklenmez.
 *  - Her yükleme ledger'a yazılır ve audit kaydı oluşur.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const productIdInput = typeof body?.productId === 'string' ? body.productId.trim() : ''
    const receiptData = typeof body?.receiptData === 'string' ? body.receiptData.trim() : ''

    if (!receiptData) {
      return NextResponse.json({ error: 'receiptData zorunludur', code: 'VALIDATION_ERROR' }, { status: 422 })
    }

    if (!isAppleBillingConfigured()) {
      return NextResponse.json(
        {
          error: 'Mağaza içi satın alma doğrulaması henüz yapılandırılmamış.',
          code: 'SERVICE_UNAVAILABLE',
          detail: 'APPLE_IAP_SHARED_SECRET tanımlanmalı.',
        },
        { status: 503 }
      )
    }

    // ── Apple doğrulaması (transactionId idempotency anahtarı olacak) ──
    const result = await verifyAppleReceipt(receiptData, productIdInput || undefined)
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Satın alma doğrulanamadı', code: 'PAYMENT_FAILED', reason: (result as { reason?: string }).reason },
        { status: 402 }
      )
    }

    const productId = result.productId || productIdInput
    const idempotencyKey = result.transactionId || result.originalTransactionId
    if (!productId || !idempotencyKey) {
      return NextResponse.json(
        { error: 'Makbuzdan ürün/işlem bilgisi okunamadı', code: 'PAYMENT_FAILED' },
        { status: 402 }
      )
    }

    // ── Idempotency: aynı işlem daha önce işlendiyse aynı sonucu dön ──
    const existing = await prisma.storePurchase.findUnique({
      where: { provider_purchaseToken: { provider: 'app_store', purchaseToken: idempotencyKey } },
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
        data: { status: existing.status, grantedType: existing.grantedType, grantedAmount: existing.grantedAmount },
      })
    }

    // Kayıt aç (verified) — UNIQUE ihlali eşzamanlı isteği engeller
    let purchase
    try {
      purchase = await prisma.storePurchase.create({
        data: {
          userId: authUser.id,
          provider: 'app_store',
          productId,
          purchaseToken: idempotencyKey,
          status: 'verified',
          verifiedAt: new Date(),
          orderId: result.originalTransactionId ?? null,
          rawResponse: result.raw,
        },
      })
    } catch {
      return NextResponse.json(
        { error: 'Bu satın alma şu anda işleniyor.', code: 'IDEMPOTENCY_CONFLICT' },
        { status: 409 }
      )
    }

    // ── Ürün eşlemesi + ödül verme (Google Play ile ortak yardımcı) ──
    const grant = await grantMappedPurchase({
      userId: authUser.id,
      productId,
      purchaseId: purchase.id,
      provider: 'app_store',
      orderId: result.originalTransactionId ?? null,
    })

    if (!grant.ok) {
      const g = grant as { error: string; code: string; httpStatus: number }
      return NextResponse.json({ error: g.error, code: g.code }, { status: g.httpStatus })
    }

    return NextResponse.json({
      success: true,
      data: {
        purchaseId: purchase.id,
        grantedType: grant.grantedType,
        grantedAmount: grant.grantedAmount,
        status: 'granted',
        environment: result.environment,
      },
    })
  } catch (error) {
    console.error('App Store verify error:', error)
    return NextResponse.json({ error: 'Satın alma işlenemedi', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
