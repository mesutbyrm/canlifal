/**
 * BÖLÜM 20 — Üyelik yaşam döngüsü (atama, yükseltme, düşürme, hediye, süre bitişi).
 *
 * Kritik kural (§23): süre dolduğunda kullanıcı Basic'e döner ve VIP hakları kapanır,
 * ANCAK kullanıcının seçtiği kozmetik veriler (çerçeve, tema, arka plan, isim efekti,
 * balon, avatar aksesuarı) SİLİNMEZ — tekrar üye olduğunda geri kullanılabilir.
 *
 * Jeton/CFC bakiyelerine dokunmaz.
 */
import prisma from '@/lib/db'
import { invalidateUserEntitlements, normalizeTierKey, getTiers } from '@/lib/vip-entitlements'
import { recordAudit } from '@/lib/audit-log'

export interface ApplyMembershipInput {
  userId: string
  tierKey: string
  durationDays?: number | null
  expiresAt?: Date | null
  source?: 'purchase' | 'gift' | 'admin' | 'renewal' | 'migration'
  giverId?: string | null
  transactionId?: string | null
  autoRenew?: boolean
  note?: string | null
  actorId?: string | null
}

export interface ApplyMembershipResult {
  ok: boolean
  grantId?: string
  previousTier?: string
  tier?: string
  expiresAt?: string | null
  error?: string
}

/**
 * Üyelik atar/yeniler. Aynı kademe yenilemesinde kalan süreye EKLER.
 * Farklı kademeye geçişte süre yeni kademeden başlar.
 */
export async function applyMembership(input: ApplyMembershipInput): Promise<ApplyMembershipResult> {
  const tiers = await getTiers()
  const known = tiers.map((t) => t.key)
  const tierKey = normalizeTierKey(input.tierKey, known)

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, membership: true, membershipExpiresAt: true },
  })
  if (!user) return { ok: false, error: 'Kullanıcı bulunamadı' }

  const previousTier = normalizeTierKey(user.membership, known)
  const now = new Date()

  let expiresAt: Date | null = null
  if (input.expiresAt) {
    expiresAt = new Date(input.expiresAt)
  } else if (input.durationDays && input.durationDays > 0) {
    const currentExp = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) : null
    const base = previousTier === tierKey && currentExp && currentExp.getTime() > now.getTime() ? currentExp : now
    expiresAt = new Date(base.getTime() + input.durationDays * 86400000)
  }

  const grant = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { membership: tierKey, membershipExpiresAt: expiresAt },
    })
    // Önceki aktif kayıtları kapat
    await tx.membershipGrant.updateMany({
      where: { receiverId: input.userId, status: 'active' },
      data: { status: 'expired' },
    })
    return tx.membershipGrant.create({
      data: {
        receiverId: input.userId,
        giverId: input.giverId || null,
        tierKey,
        previousTier,
        source: input.source || 'admin',
        startsAt: now,
        expiresAt,
        transactionId: input.transactionId || null,
        status: tierKey === 'basic' ? 'cancelled' : 'active',
        autoRenew: !!input.autoRenew,
        note: input.note || null,
      },
      select: { id: true },
    })
  })

  invalidateUserEntitlements(input.userId)

  await recordAudit({
    actorId: input.actorId || input.giverId || 'system',
    action: 'membership_change',
    targetType: 'User',
    targetId: input.userId,
    before: { membership: previousTier, membershipExpiresAt: user.membershipExpiresAt },
    after: { membership: tierKey, membershipExpiresAt: expiresAt },
    metadata: { source: input.source || 'admin', grantId: grant.id, transactionId: input.transactionId || null },
  }).catch(() => null)

  return {
    ok: true,
    grantId: grant.id,
    previousTier,
    tier: tierKey,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  }
}

/**
 * Süresi dolmuş üyelikleri Basic'e düşürür.
 * Kozmetik seçimleri SİLİNMEZ.
 */
export async function sweepExpiredMemberships(limit = 500): Promise<{ processed: number; userIds: string[] }> {
  const now = new Date()
  const expired = await prisma.user.findMany({
    where: {
      membership: { not: 'basic' },
      membershipExpiresAt: { not: null, lte: now },
    },
    select: { id: true, membership: true, membershipExpiresAt: true },
    take: limit,
  })

  const ids: string[] = []
  for (const u of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: u.id },
          data: { membership: 'basic' }, // membershipExpiresAt korunur (geçmiş referansı)
        })
        await tx.membershipGrant.updateMany({
          where: { receiverId: u.id, status: 'active' },
          data: { status: 'expired' },
        })
      })
      invalidateUserEntitlements(u.id)
      ids.push(u.id)
      await recordAudit({
        actorId: 'system',
        action: 'membership_expired',
        targetType: 'User',
        targetId: u.id,
        before: { membership: u.membership, membershipExpiresAt: u.membershipExpiresAt },
        after: { membership: 'basic' },
        metadata: { reason: 'auto_expiry_sweep' },
      }).catch(() => null)
    } catch {
      // tek kullanıcı hatası taramayı durdurmaz
    }
  }
  return { processed: ids.length, userIds: ids }
}

/** Yakında bitecek üyelikler (admin raporu §24). */
export async function membershipsExpiringWithin(days: number, limit = 200) {
  const now = new Date()
  const until = new Date(now.getTime() + days * 86400000)
  return prisma.user.findMany({
    where: {
      membership: { not: 'basic' },
      membershipExpiresAt: { gt: now, lte: until },
    },
    select: { id: true, name: true, username: true, email: true, membership: true, membershipExpiresAt: true },
    orderBy: { membershipExpiresAt: 'asc' },
    take: limit,
  })
}
