import { randomBytes } from 'crypto'
import prisma from '@/lib/db'
import { getCommissionConfig, getCommissionSummary } from '@/lib/referral-commission'

/** Davet bağlantısının üretileceği kök adres (runtime değeri). */
export function referralOrigin(): string {
  return (process.env.NEXTAUTH_URL || 'https://canlifal.com').replace(/\/+$/, '')
}

export function buildInviteLink(code: string | null | undefined): string | null {
  if (!code) return null
  return `${referralOrigin()}/kayit-ol?ref=${encodeURIComponent(code)}`
}

/**
 * Kullanıcının davet kodunu döndürür; henüz üretilmemişse (eski kayıtlar)
 * kayıt akışındaki ile aynı biçimde üretip kalıcılaştırır.
 */
export async function ensureReferralCode(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })
  if (!user) return null
  if (user.referralCode) return user.referralCode

  for (let i = 0; i < 10; i++) {
    const candidate = randomBytes(4).toString('hex').toUpperCase()
    const clash = await prisma.user.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    })
    if (clash) continue
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: candidate },
        select: { referralCode: true },
      })
      return updated.referralCode
    } catch {
      // eşzamanlı üretim: tekrar dene
    }
  }
  return null
}

/**
 * Mobil uygulamanın davet ekranının beklediği zengin özet.
 * Tek kaynak: `/api/referral/stats`, `/api/referral/me`, `/api/referral/invite-link`
 * bu yardımcıyı kullanır; mantık tekrarı yoktur.
 */
export async function buildReferralStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, referralCreditsEarned: true },
  })
  if (!user) return null
  const referralCode = user.referralCode || (await ensureReferralCode(userId))

  const [summary, config, invitedCount, activeReferralCount] = await Promise.all([
    getCommissionSummary(userId),
    getCommissionConfig(),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.user.count({ where: { referredById: userId, isBanned: false } }),
  ])

  const lifetimeLimit = config.referralTotalLimit || 0
  const monthlyLimit = config.referralMonthlyLimit || 0
  const lifetimeEarnings = summary.totalEarned
  const monthEarnings = summary.monthlyEarned
  const cappedEarnings = lifetimeLimit > 0 ? Math.max(0, lifetimeEarnings - lifetimeLimit) : 0

  return {
    referralCode,
    shareUrl: buildInviteLink(referralCode),
    inviteLink: buildInviteLink(referralCode),
    referralLink: buildInviteLink(referralCode),
    headline: 'Arkadaşını davet et, kazan',
    rewardHint: config.referralEnabled
      ? `Davet ettiğin kullanıcının her yüklemesinden %${config.referralRate} kazanırsın.`
      : 'Davet komisyonu şu anda kapalı.',
    enabled: config.referralEnabled,
    rate: config.referralRate,
    minTopup: config.referralMinTopup,
    invitedCount,
    inviteCount: invitedCount,
    activeReferralCount,
    totalEarnings: summary.totalEarned,
    referralCreditsEarned: user.referralCreditsEarned,
    monthEarnings,
    pendingEarnings: 0,
    availableEarnings: summary.totalEarned,
    reversedEarnings: 0,
    cappedEarnings,
    lifetimeEarnings,
    monthlyLimit,
    lifetimeLimit,
    transactionCount: summary.transactionCount,
    currency: 'cfc',
  }
}
