// Apple App Store IAP doğrulama yardımcısı (legacy verifyReceipt yöntemi).
// Güvenli-kapalı: APPLE_IAP_SHARED_SECRET tanımlı değilse yapılandırılmamış sayılır (503).
// verifyReceipt üretim uç noktasına gönderir; 21007 dönerse sandbox'a düşer.

import { getSecret } from '@/lib/integration-secrets'

/** Apple paylaşılan sırrı: önce şifreli yapılandırma deposu, sonra ortam değişkeni. */
export async function getAppleSharedSecret(): Promise<string | null> {
  return getSecret('apple', 'apple_iap', 'shared_secret', 'APPLE_IAP_SHARED_SECRET')
}

const PROD_URL = 'https://buy.itunes.apple.com/verifyReceipt'
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt'

export async function isAppleBillingConfigured(): Promise<boolean> {
  return !!(await getAppleSharedSecret())
}

export type AppleVerifyResult =
  | {
      ok: true
      raw: any
      environment: 'Production' | 'Sandbox'
      productId: string | null
      transactionId: string | null
      originalTransactionId: string | null
      expiresDateMs: number | null
    }
  | { ok: false; reason: string; raw?: any }

async function callVerify(url: string, receiptData: string, sharedSecret: string): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      password: sharedSecret,
      'exclude-old-transactions': true,
    }),
  })
  return res.json()
}

// En son satın alma bilgisini (in_app veya latest_receipt_info) çıkarır.
function extractLatest(raw: any, wantedProductId?: string): {
  productId: string | null
  transactionId: string | null
  originalTransactionId: string | null
  expiresDateMs: number | null
} {
  const candidates: any[] = []
  if (Array.isArray(raw?.latest_receipt_info)) candidates.push(...raw.latest_receipt_info)
  if (Array.isArray(raw?.receipt?.in_app)) candidates.push(...raw.receipt.in_app)

  let list = candidates
  if (wantedProductId) {
    const filtered = candidates.filter((c) => c?.product_id === wantedProductId)
    if (filtered.length) list = filtered
  }
  list.sort((a, b) => Number(b?.purchase_date_ms || 0) - Number(a?.purchase_date_ms || 0))
  const item = list[0] || {}
  return {
    productId: item?.product_id ?? null,
    transactionId: item?.transaction_id ?? null,
    originalTransactionId: item?.original_transaction_id ?? null,
    expiresDateMs: item?.expires_date_ms ? Number(item.expires_date_ms) : null,
  }
}

export async function verifyAppleReceipt(
  receiptData: string,
  wantedProductId?: string
): Promise<AppleVerifyResult> {
  const sharedSecret = await getAppleSharedSecret()
  if (!sharedSecret) return { ok: false, reason: 'apple_not_configured' }
  if (!receiptData) return { ok: false, reason: 'missing_receipt' }

  try {
    let raw = await callVerify(PROD_URL, receiptData, sharedSecret)
    let environment: 'Production' | 'Sandbox' = 'Production'

    // 21007: sandbox makbuzu üretim uç noktasına gönderildi → sandbox'ta tekrar dene
    if (raw?.status === 21007) {
      raw = await callVerify(SANDBOX_URL, receiptData, sharedSecret)
      environment = 'Sandbox'
    }

    if (raw?.status !== 0) {
      return { ok: false, reason: `apple_status_${raw?.status}`, raw }
    }

    const info = extractLatest(raw, wantedProductId)
    return {
      ok: true,
      raw,
      environment,
      productId: info.productId,
      transactionId: info.transactionId,
      originalTransactionId: info.originalTransactionId,
      expiresDateMs: info.expiresDateMs,
    }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'apple_exception' }
  }
}
