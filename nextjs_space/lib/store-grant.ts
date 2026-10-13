// Mağaza satın alması ödül verme yardımcısı (Google Play + Apple App Store ortak mantığı).
// StorePurchase kaydı DOĞRULANDIKTAN sonra çağrılır: ürün eşlemesini okur,
// bakiyeyi/üyeliği yükler, ledger + audit yazar ve kaydı 'granted' yapar.
// İstemci ASLA tutar belirlemez; ne verileceği sunucudaki `store_products_map` ayarından okunur.

import prisma from '@/lib/db'
import { recordLedger } from '@/lib/ledger'
import { recordAudit } from '@/lib/audit-log'
import { getCachedPlatformSetting } from '@/lib/cache'

type GrantOk = { ok: true; grantedType: string; grantedAmount: number; ledgerTxId: string | null }
type GrantErr = { ok: false; code: string; error: string; httpStatus: number }

export async function grantMappedPurchase(opts: {
  userId: string
  productId: string
  purchaseId: string
  provider: string
  orderId?: string | null
}): Promise<GrantOk | GrantErr> {
  const { userId, productId, purchaseId, provider, orderId } = opts

  const mapRaw = await getCachedPlatformSetting('store_products_map', '{}')
  let map: Record<string, any> = {}
  try { map = JSON.parse(mapRaw) } catch { map = {} }
  const entry = map[productId]
  if (!entry || typeof entry !== 'object') {
    await prisma.storePurchase.update({
      where: { id: purchaseId },
      data: { status: 'failed', failureReason: 'product_not_mapped' },
    }).catch(() => {})
    return { ok: false, code: 'NOT_FOUND', error: 'Ürün tanımlı değil. Lütfen destek ile iletişime geçin.', httpStatus: 404 }
  }

  const grantType = String(entry.type || '')
  const amount = Number.isFinite(Number(entry.amount)) ? Math.max(0, Math.floor(Number(entry.amount))) : 0
  let grantedAmount = 0
  let ledgerTxId: string | null = null

  if (grantType === 'jeton' || grantType === 'cfc') {
    if (amount <= 0) {
      await prisma.storePurchase.update({
        where: { id: purchaseId }, data: { status: 'failed', failureReason: 'invalid_amount' },
      }).catch(() => {})
      return { ok: false, code: 'VALIDATION_ERROR', error: 'Geçersiz ürün tanımı', httpStatus: 422 }
    }
    const updated = await prisma.$transaction(async (tx: any) => {
      const before = await tx.user.findUnique({ where: { id: userId }, select: { jetonBalance: true, credits: true } })
      const after = await tx.user.update({
        where: { id: userId },
        data: grantType === 'jeton' ? { jetonBalance: { increment: amount } } : { credits: { increment: amount } },
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
          accountId: userId,
          balanceBefore: grantType === 'jeton' ? updated.before?.jetonBalance : updated.before?.credits,
          balanceAfter: grantType === 'jeton' ? updated.after?.jetonBalance : updated.after?.credits,
        },
        amount,
        category: 'purchase',
        currency: grantType === 'jeton' ? 'jeton' : 'cfc',
        description: `${provider} satın alma: ${productId}`,
        referenceType: 'StorePurchase',
        referenceId: purchaseId,
        metadata: { provider, orderId },
      })
      ledgerTxId = (tx as any)?.transactionId ?? (tx as any)?.id ?? null
    } catch (e) {
      console.error('Ledger write failed for store purchase', e)
    }
  } else if (grantType === 'membership') {
    const days = Number.isFinite(Number(entry.days)) ? Math.max(1, Math.floor(Number(entry.days))) : 30
    const plan = String(entry.plan || 'gold')
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { membershipExpiresAt: true } })
    const base = current?.membershipExpiresAt && current.membershipExpiresAt > new Date() ? current.membershipExpiresAt : new Date()
    const expires = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
    await prisma.user.update({ where: { id: userId }, data: { membership: plan, membershipExpiresAt: expires } })
    grantedAmount = days
  } else {
    await prisma.storePurchase.update({
      where: { id: purchaseId }, data: { status: 'failed', failureReason: 'unknown_grant_type' },
    }).catch(() => {})
    return { ok: false, code: 'VALIDATION_ERROR', error: 'Geçersiz ürün tipi', httpStatus: 422 }
  }

  await prisma.storePurchase.update({
    where: { id: purchaseId },
    data: { status: 'granted', grantedType: grantType, grantedAmount, ledgerTxId, grantedAt: new Date() },
  })

  await recordAudit({
    actorId: userId,
    action: `billing.${provider}_granted`,
    targetType: 'StorePurchase',
    targetId: purchaseId,
    description: `${provider} satın alma işlendi: ${productId}`,
    metadata: { grantType, grantedAmount, orderId },
  })

  return { ok: true, grantedType: grantType, grantedAmount, ledgerTxId }
}
