import prisma from '@/lib/db'
import { getCachedPlatformSetting, invalidateCache } from '@/lib/cache'
import { recordLedger } from '@/lib/ledger'

/**
 * BÖLÜM 21 / A3 — Ajans cüzdanı çekirdeği (§13–§18).
 *
 * Kurallar:
 *  - Bakiye asla "tek bir sayı" olarak elle değiştirilmez; her hareket
 *    AgencyWalletTransaction satırı üretir (immutable ledger, §17).
 *  - Düzeltmeler eski satırı güncellemez, yeni bir düzeltme satırı ekler.
 *  - Bu bakiye nakit olarak çekilemez (§14); yalnızca izin verilen
 *    platform içi kullanımlar için harcanır.
 */

// ── Ayar anahtarları (hiçbiri sabit kodlanmaz) ─────────────
export const AGENCY_SETTING_KEYS = {
  tlToJetonRate: 'agency.wallet.tl_to_jeton_rate',
  allowedUses: 'agency.wallet.allowed_uses',
  minTopUpTl: 'agency.wallet.min_topup_tl',
  maxTransferPerTxn: 'agency.wallet.max_transfer_per_txn',
  walletEnabled: 'agency.wallet.enabled',
} as const

export const AGENCY_WALLET_USES = [
  { key: 'transfer_member', label: 'Ajans üyesine jeton gönder', defaultOn: true },
  { key: 'transfer_any_user', label: 'Diğer kullanıcılara jeton aktar', defaultOn: false },
  { key: 'gift', label: 'Hediye olarak kullan', defaultOn: false },
] as const

export const AGENCY_COMMISSION_SOURCES = [
  { key: 'stream_gift', label: 'Canlı yayın hediyesi', defaultEnabled: true },
  { key: 'chat_gift', label: 'Sesli sohbet hediyesi', defaultEnabled: true },
  { key: 'direct_gift', label: 'Doğrudan hediye', defaultEnabled: true },
  { key: 'tip', label: 'Bahşiş', defaultEnabled: true },
  { key: 'voice_room', label: 'Oda geliri', defaultEnabled: true },
  // §18: Ajansların canlı falcılardan kazanması VARSAYILAN OLARAK KAPALI
  { key: 'fortune', label: 'Canlı falcı geliri', defaultEnabled: false },
] as const

export const AGENCY_LEVELS = [
  { key: 'bronze', label: 'Bronz', bonusRate: 2, sortOrder: 1 },
  { key: 'silver', label: 'Silver', bonusRate: 3, sortOrder: 2 },
  { key: 'gold', label: 'Gold', bonusRate: 5, sortOrder: 3 },
  { key: 'diamond', label: 'Diamond', bonusRate: 7, sortOrder: 4 },
] as const

// ── TL → jeton kuru ────────────────────────────────────────
/**
 * Ajans yüklemeleri için kur. Ayar yoksa mevcut jeton paketlerinden
 * türetilir; böylece mevcut satış fiyatlaması hiç değişmez.
 */
export async function getAgencyJetonRate(): Promise<{ rate: number; source: string }> {
  const raw = await getCachedPlatformSetting(AGENCY_SETTING_KEYS.tlToJetonRate, '')
  const parsed = parseFloat(raw)
  if (raw && !isNaN(parsed) && parsed > 0) return { rate: parsed, source: 'setting' }

  try {
    const pkgs = await prisma.creditPackage.findMany({
      where: { isActive: true, price: { gt: 0 } },
      select: { credits: true, bonusCredits: true, price: true },
      orderBy: { sortOrder: 'asc' },
    })
    if (pkgs.length > 0) {
      const rates = pkgs
        .map((p: any) => (p.credits + (p.bonusCredits || 0)) / p.price)
        .filter((r: number) => isFinite(r) && r > 0)
        .sort((a: number, b: number) => a - b)
      if (rates.length > 0) {
        const mid = rates[Math.floor(rates.length / 2)]
        return { rate: Math.round(mid * 100) / 100, source: 'package_derived' }
      }
    }
  } catch { /* yut */ }

  return { rate: 2, source: 'fallback' }
}

// ── Bonus oranı ────────────────────────────────────────────
export async function getBonusRateForLevel(level: string): Promise<number> {
  try {
    const rule = await prisma.agencyBonusRule.findUnique({ where: { level } })
    if (rule && rule.isActive) return rule.bonusRate
  } catch { /* yut */ }
  const fallback = AGENCY_LEVELS.find((l) => l.key === level)
  return fallback ? fallback.bonusRate : 0
}

export async function getAllBonusRules() {
  try {
    const rules = await prisma.agencyBonusRule.findMany({ orderBy: { sortOrder: 'asc' } })
    if (rules.length > 0) return rules
  } catch { /* yut */ }
  return AGENCY_LEVELS.map((l) => ({
    id: l.key, level: l.key, label: l.label, bonusRate: l.bonusRate,
    minMonthlyEarning: 0, minActiveBroadcasters: 0, minStreamMinutes: 0,
    isActive: true, sortOrder: l.sortOrder,
  }))
}

// ── İzin verilen kullanımlar ───────────────────────────────
export async function getAllowedWalletUses(): Promise<string[]> {
  const raw = await getCachedPlatformSetting(AGENCY_SETTING_KEYS.allowedUses, '')
  if (raw) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr.map((x) => String(x))
    } catch { /* yut */ }
  }
  return AGENCY_WALLET_USES.filter((u) => u.defaultOn).map((u) => u.key)
}

// ── Cüzdan ─────────────────────────────────────────────────
export async function getOrCreateWallet(agencyId: string) {
  const existing = await prisma.agencyWallet.findUnique({ where: { agencyId } })
  if (existing) return existing
  return prisma.agencyWallet.create({ data: { agencyId } })
}

export type WalletMoveResult =
  | { ok: true; txnId: string; balanceBefore: number; balanceAfter: number; bonus?: number }
  | { ok: false; code: string; message: string }

/**
 * Yükleme (§13): TL → temel jeton + bonus jeton. İki ayrı ledger satırı üretir.
 */
export async function topUpWallet(params: {
  agencyId: string
  tlAmount?: number
  jetonAmount?: number
  actorId: string
  actorName: string
  actorRole?: string
  reason: string
  idempotencyKey?: string
}): Promise<WalletMoveResult> {
  const agency = await prisma.agency.findUnique({
    where: { id: params.agencyId },
    select: { id: true, level: true, status: true },
  })
  if (!agency) return { ok: false, code: 'NOT_FOUND', message: 'Ajans bulunamadı' }

  if (params.idempotencyKey) {
    const dup = await prisma.agencyWalletTransaction.findFirst({
      where: { agencyId: params.agencyId, idempotencyKey: params.idempotencyKey },
    })
    if (dup) {
      return { ok: true, txnId: dup.id, balanceBefore: dup.balanceBefore, balanceAfter: dup.balanceAfter }
    }
  }

  const { rate } = await getAgencyJetonRate()
  let baseJeton = 0
  let tlAmount: number | null = null
  if (params.tlAmount && params.tlAmount > 0) {
    tlAmount = params.tlAmount
    baseJeton = Math.floor(params.tlAmount * rate)
  } else if (params.jetonAmount && params.jetonAmount > 0) {
    baseJeton = Math.floor(params.jetonAmount)
  }
  if (baseJeton <= 0) return { ok: false, code: 'BAD_REQUEST', message: 'Geçersiz yükleme tutarı' }

  const bonusRate = await getBonusRateForLevel(agency.level || 'bronze')
  const bonusJeton = Math.floor((baseJeton * bonusRate) / 100)

  const wallet = await getOrCreateWallet(params.agencyId)
  const before = wallet.jetonBalance
  const afterBase = before + baseJeton
  const afterAll = afterBase + bonusJeton

  const result = await prisma.$transaction(async (tx: any) => {
    const topupTxn = await tx.agencyWalletTransaction.create({
      data: {
        agencyId: params.agencyId, type: 'topup', direction: 'credit',
        amount: baseJeton, balanceBefore: before, balanceAfter: afterBase,
        tlAmount, rateUsed: tlAmount ? rate : null,
        actorId: params.actorId, actorName: params.actorName, actorRole: params.actorRole,
        reason: params.reason, idempotencyKey: params.idempotencyKey || null,
      },
    })
    if (bonusJeton > 0) {
      await tx.agencyWalletTransaction.create({
        data: {
          agencyId: params.agencyId, type: 'bonus', direction: 'credit',
          amount: bonusJeton, balanceBefore: afterBase, balanceAfter: afterAll,
          bonusRate, actorId: params.actorId, actorName: params.actorName,
          actorRole: params.actorRole, reason: `Ajans bonusu (%${bonusRate})`,
          referenceType: 'agency_wallet_txn', referenceId: topupTxn.id,
        },
      })
    }
    await tx.agencyWallet.update({
      where: { agencyId: params.agencyId },
      data: {
        jetonBalance: afterAll,
        totalTopUp: { increment: baseJeton },
        totalBonus: { increment: bonusJeton },
      },
    })
    return topupTxn
  })

  recordLedger({
    debit: { accountType: 'platform_jeton', accountId: 'PLATFORM' },
    credit: { accountType: 'agency_jeton' as any, accountId: params.agencyId },
    amount: baseJeton + bonusJeton,
    category: 'agency_wallet_topup',
    currency: 'jeton',
    actorId: params.actorId,
    referenceType: 'agency_wallet_txn',
    referenceId: result.id,
    metadata: { baseJeton, bonusJeton, bonusRate, tlAmount, rate },
  }).catch(() => {})

  return { ok: true, txnId: result.id, balanceBefore: before, balanceAfter: afterAll, bonus: bonusJeton }
}

/**
 * Ajans → kullanıcı jeton aktarımı (§15).
 */
export async function transferToUser(params: {
  agencyId: string
  targetUserId: string
  amount: number
  actorId: string
  actorName: string
  actorRole?: string
  reason?: string
  idempotencyKey?: string
  useKey?: string
}): Promise<WalletMoveResult> {
  const amount = Math.floor(params.amount)
  if (!amount || amount <= 0) return { ok: false, code: 'BAD_REQUEST', message: 'Geçersiz miktar' }

  const enabled = await getCachedPlatformSetting(AGENCY_SETTING_KEYS.walletEnabled, 'true')
  if (enabled === 'false') return { ok: false, code: 'DISABLED', message: 'Ajans cüzdanı şu anda kapalı' }

  const allowed = await getAllowedWalletUses()
  const useKey = params.useKey || 'transfer_member'
  if (!allowed.includes(useKey)) {
    return { ok: false, code: 'USE_NOT_ALLOWED', message: 'Bu kullanım türü admin tarafından kapatılmış' }
  }

  const maxRaw = await getCachedPlatformSetting(AGENCY_SETTING_KEYS.maxTransferPerTxn, '0')
  const maxPer = parseFloat(maxRaw)
  if (maxPer > 0 && amount > maxPer) {
    return { ok: false, code: 'LIMIT_EXCEEDED', message: `Tek işlemde en fazla ${maxPer} jeton gönderilebilir` }
  }

  if (params.idempotencyKey) {
    const dup = await prisma.agencyWalletTransaction.findFirst({
      where: { agencyId: params.agencyId, idempotencyKey: params.idempotencyKey },
    })
    if (dup) return { ok: true, txnId: dup.id, balanceBefore: dup.balanceBefore, balanceAfter: dup.balanceAfter }
  }

  const target = await prisma.user.findUnique({
    where: { id: params.targetUserId },
    select: { id: true, name: true, jetonBalance: true },
  })
  if (!target) return { ok: false, code: 'NOT_FOUND', message: 'Hedef kullanıcı bulunamadı' }

  // §47 — yalnızca kendi ajansına bağlı üye (transfer_member kullanımında)
  if (useKey === 'transfer_member') {
    const membership = await prisma.agencyUser.findUnique({ where: { userId: params.targetUserId } })
    if (!membership || membership.agencyId !== params.agencyId || !membership.isActive) {
      return { ok: false, code: 'NOT_MEMBER', message: 'Kullanıcı bu ajansın aktif üyesi değil' }
    }
  }

  const wallet = await getOrCreateWallet(params.agencyId)
  if (wallet.isLocked) return { ok: false, code: 'WALLET_LOCKED', message: 'Ajans cüzdanı kilitli' }
  if (wallet.jetonBalance < amount) {
    return { ok: false, code: 'INSUFFICIENT_BALANCE', message: 'Ajans bakiyesi yetersiz' }
  }

  const before = wallet.jetonBalance
  const after = before - amount
  const userBefore = target.jetonBalance ?? 0
  const userAfter = userBefore + amount

  const txn = await prisma.$transaction(async (tx: any) => {
    // Yarış koşulu koruması: bakiye hâlâ yeterliyse düş
    const updated = await tx.agencyWallet.updateMany({
      where: { agencyId: params.agencyId, jetonBalance: { gte: amount }, isLocked: false },
      data: {
        jetonBalance: { decrement: amount },
        totalTransferred: { increment: amount },
      },
    })
    if (updated.count === 0) throw new Error('INSUFFICIENT_BALANCE')

    await tx.user.update({
      where: { id: params.targetUserId },
      data: { jetonBalance: { increment: amount } },
    })
    await tx.jetonTransaction.create({
      data: {
        userId: params.targetUserId,
        amount,
        type: 'agency_transfer',
        description: `Ajans jeton transferi (${params.actorName})${params.reason ? ': ' + params.reason : ''}`,
        balanceBefore: userBefore,
        balanceAfter: userAfter,
      },
    })
    return tx.agencyWalletTransaction.create({
      data: {
        agencyId: params.agencyId, type: 'transfer', direction: 'debit',
        amount, balanceBefore: before, balanceAfter: after,
        targetUserId: target.id, targetUserName: target.name || target.id,
        actorId: params.actorId, actorName: params.actorName, actorRole: params.actorRole,
        reason: params.reason || null, idempotencyKey: params.idempotencyKey || null,
        metadata: JSON.stringify({ useKey, userBefore, userAfter }),
      },
    })
  }).catch((e: any) => {
    if (String(e?.message).includes('INSUFFICIENT_BALANCE')) return null
    throw e
  })

  if (!txn) return { ok: false, code: 'INSUFFICIENT_BALANCE', message: 'Ajans bakiyesi yetersiz' }

  recordLedger({
    debit: { accountType: 'agency_jeton' as any, accountId: params.agencyId },
    credit: { accountType: 'user_jeton' as any, accountId: target.id },
    amount,
    category: 'agency_wallet_transfer',
    currency: 'jeton',
    actorId: params.actorId,
    referenceType: 'agency_wallet_txn',
    referenceId: txn.id,
    metadata: { useKey, reason: params.reason },
  }).catch(() => {})

  return { ok: true, txnId: txn.id, balanceBefore: before, balanceAfter: after }
}

/**
 * Admin düzeltmesi (§17): geçmiş değiştirilmez, yeni düzeltme satırı eklenir.
 */
export async function adjustWallet(params: {
  agencyId: string
  amount: number // + credit, - debit
  actorId: string
  actorName: string
  actorRole?: string
  reason: string
}): Promise<WalletMoveResult> {
  const amount = Math.floor(params.amount)
  if (!amount) return { ok: false, code: 'BAD_REQUEST', message: 'Geçersiz miktar' }

  const wallet = await getOrCreateWallet(params.agencyId)
  const before = wallet.jetonBalance
  const after = before + amount
  if (after < 0) return { ok: false, code: 'BAD_REQUEST', message: 'Bakiye negatife düşemez' }

  const txn = await prisma.$transaction(async (tx: any) => {
    await tx.agencyWallet.update({
      where: { agencyId: params.agencyId },
      data: { jetonBalance: after, totalAdjusted: { increment: amount } },
    })
    return tx.agencyWalletTransaction.create({
      data: {
        agencyId: params.agencyId,
        type: amount > 0 ? 'adjust_credit' : 'adjust_debit',
        direction: amount > 0 ? 'credit' : 'debit',
        amount: Math.abs(amount), balanceBefore: before, balanceAfter: after,
        actorId: params.actorId, actorName: params.actorName, actorRole: params.actorRole,
        reason: params.reason,
      },
    })
  })

  recordLedger({
    debit: amount > 0
      ? { accountType: 'platform_jeton', accountId: 'PLATFORM' }
      : { accountType: 'agency_jeton' as any, accountId: params.agencyId },
    credit: amount > 0
      ? { accountType: 'agency_jeton' as any, accountId: params.agencyId }
      : { accountType: 'platform_jeton', accountId: 'PLATFORM' },
    amount: Math.abs(amount),
    category: 'agency_wallet_adjust',
    currency: 'jeton',
    actorId: params.actorId,
    referenceType: 'agency_wallet_txn',
    referenceId: txn.id,
    metadata: { reason: params.reason },
  }).catch(() => {})

  return { ok: true, txnId: txn.id, balanceBefore: before, balanceAfter: after }
}

// ── Komisyon kuralları (§18) ───────────────────────────────
export type ResolvedRule = { sourceType: string; enabled: boolean; rate: number | null; scope: 'agency' | 'global' | 'default' }

export async function getCommissionRules(agencyId?: string | null): Promise<ResolvedRule[]> {
  const [globals, locals] = await Promise.all([
    prisma.agencyCommissionRule.findMany({ where: { agencyId: null } }).catch(() => [] as any[]),
    agencyId
      ? prisma.agencyCommissionRule.findMany({ where: { agencyId } }).catch(() => [] as any[])
      : Promise.resolve([] as any[]),
  ])
  return AGENCY_COMMISSION_SOURCES.map((src) => {
    const local = locals.find((r: any) => r.sourceType === src.key)
    if (local) return { sourceType: src.key, enabled: local.enabled, rate: local.rate, scope: 'agency' as const }
    const g = globals.find((r: any) => r.sourceType === src.key)
    if (g) return { sourceType: src.key, enabled: g.enabled, rate: g.rate, scope: 'global' as const }
    return { sourceType: src.key, enabled: src.defaultEnabled, rate: null, scope: 'default' as const }
  })
}

/**
 * Tek kaynak için çözümlenmiş kural. Kayıt yoksa katalog varsayılanı kullanılır;
 * böylece mevcut davranış hiç değişmez (falcı hariç: varsayılan kapalı).
 */
export async function resolveCommissionRule(agencyId: string, sourceType: string): Promise<{ enabled: boolean; rate: number | null }> {
  try {
    const local = await prisma.agencyCommissionRule.findFirst({ where: { agencyId, sourceType } })
    if (local) return { enabled: local.enabled, rate: local.rate }
    const global = await prisma.agencyCommissionRule.findFirst({ where: { agencyId: null, sourceType } })
    if (global) return { enabled: global.enabled, rate: global.rate }
  } catch { /* yut */ }
  const def = AGENCY_COMMISSION_SOURCES.find((s) => s.key === sourceType)
  return { enabled: def ? def.defaultEnabled : true, rate: null }
}

export function invalidateAgencySettingsCache() {
  Object.values(AGENCY_SETTING_KEYS).forEach((k) => invalidateCache(`platform:${k}`))
  invalidateCache('platform:__all__')
}
