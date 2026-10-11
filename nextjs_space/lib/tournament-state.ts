/**
 * lib/tournament-state.ts — Turnuva durum makinesi ve yardımcı fonksiyonlar.
 *
 * Durumlar:
 *   draft → registration → active → completed → rewarded
 *                                  ↓
 *                              cancelled
 *
 * `draft`: Admin oluşturdu ama henüz görünür değil.
 * `registration`: Kullanıcılar katılabilir.
 * `active`: Turnuva başladı, puanlama işliyor.
 * `completed`: Süre doldu, leaderboard donduruldu.
 * `rewarded`: Ödüller dağıtıldı.
 * `cancelled`: İptal edildi (herhangi bir noktadan).
 */

import prisma from '@/lib/db'

export type TournamentStatus = 'draft' | 'registration' | 'active' | 'completed' | 'rewarded' | 'cancelled'

export const TOURNAMENT_STATUSES: TournamentStatus[] = [
  'draft', 'registration', 'active', 'completed', 'rewarded', 'cancelled'
]

const ALLOWED_TRANSITIONS: Record<string, TournamentStatus[]> = {
  draft:        ['registration', 'active', 'cancelled'],
  registration: ['active', 'cancelled'],
  active:       ['completed', 'cancelled'],
  completed:    ['rewarded'],
  rewarded:     [],  // terminal
  cancelled:    [],  // terminal
}

export const TERMINAL_STATUSES: TournamentStatus[] = ['rewarded', 'cancelled']

/**
 * Durum geçişini doğrular. Geçerli ise null, geçersiz ise hata mesajı döner.
 */
export function checkTournamentTransition(from: string, to: TournamentStatus): string | null {
  const allowed = ALLOWED_TRANSITIONS[from]
  if (!allowed) return `Geçersiz kaynak durum: ${from}`
  if (!allowed.includes(to)) return `${from} → ${to} geçişi izin verilmiyor`
  return null
}

/**
 * Turnuva durumunu güvenli şekilde günceller (iyimser kilit).
 * @returns Güncel turnuva veya geçiş hatalarında null.
 */
export async function transitionTournament(tournamentId: string, newStatus: TournamentStatus) {
  const tournament = await prisma.weeklyTournament.findUnique({ where: { id: tournamentId } })
  if (!tournament) return null

  const err = checkTournamentTransition(tournament.status, newStatus)
  if (err) throw new Error(err)

  // Ek veriler
  const extra: any = {}
  if (newStatus === 'rewarded') extra.rewardedAt = new Date()

  try {
    return await prisma.weeklyTournament.update({
      where: { id: tournamentId, status: tournament.status } as any, // iyimser kilit
      data: { status: newStatus, ...extra },
    })
  } catch {
    // Başka bir işlem önce durumu değiştirdi
    return null
  }
}

/**
 * Turnuvaya katılım — yalniz `registration` veya `active` durumunda.
 * Yeni giriş oluşturur veya mevcut girişi döner (idempotent).
 */
export async function joinTournament(tournamentId: string, userId: string) {
  const tournament = await prisma.weeklyTournament.findUnique({ where: { id: tournamentId } })
  if (!tournament) throw new Error('Turnuva bulunamadı')
  if (!['registration', 'active'].includes(tournament.status)) {
    throw new Error('Turnuvaya katılım açık değil')
  }

  if (tournament.maxParticipants) {
    const count = await prisma.weeklyTournamentEntry.count({ where: { tournamentId } })
    if (count >= tournament.maxParticipants) throw new Error('Turnuva dolu')
  }

  return prisma.weeklyTournamentEntry.upsert({
    where: { tournamentId_userId: { tournamentId, userId } },
    update: {},
    create: { tournamentId, userId, score: 0 },
  })
}

/**
 * Katılımcı puanini arttırır (aktif turnuva kontrolü dahil).
 */
export async function incrementScore(tournamentId: string, userId: string, amount: number) {
  const tournament = await prisma.weeklyTournament.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  })
  if (!tournament || tournament.status !== 'active') return null

  return prisma.weeklyTournamentEntry.upsert({
    where: { tournamentId_userId: { tournamentId, userId } },
    update: { score: { increment: amount } },
    create: { tournamentId, userId, score: amount },
  })
}

/**
 * Turnuva lider tablosunu doğrudan veritabanından alır (top N).
 */
export async function getLeaderboard(tournamentId: string, limit = 50) {
  return prisma.weeklyTournamentEntry.findMany({
    where: { tournamentId },
    orderBy: { score: 'desc' },
    take: limit,
    select: {
      userId: true,
      score: true,
      rank: true,
    },
  })
}

/**
 * Turnuva tamamlandığında sıralamaları yazar.
 */
export async function snapshotRanks(tournamentId: string) {
  const entries = await prisma.weeklyTournamentEntry.findMany({
    where: { tournamentId },
    orderBy: { score: 'desc' },
  })
  // Toplu güncelleme (her girişin sırasını yaz)
  for (let i = 0; i < entries.length; i++) {
    await prisma.weeklyTournamentEntry.update({
      where: { id: entries[i].id },
      data: { rank: i + 1 },
    })
  }
  return entries.length
}

/**
 * Süresi dolmuş aktif turnuvaları `completed` durumuna geçirir.
 * Haftalık cron veya hediye/skor yazımı sırasında çağrılabilir.
 */
export async function finalizeExpiredTournaments(): Promise<number> {
  const now = new Date()
  const expired = await prisma.weeklyTournament.findMany({
    where: {
      status: 'active',
      weekEnd: { lte: now },
    },
    select: { id: true },
    take: 20,
  })
  let count = 0
  for (const t of expired) {
    const updated = await transitionTournament(t.id, 'completed')
    if (updated) {
      await snapshotRanks(t.id)
      count++
    }
  }
  return count
}

/** Yeni turnuva önerisindeki gerekli alanları doğrular. */
export function validateTournamentData(data: any): string | null {
  if (!data.title?.trim()) return 'Başlık gerekli'
  if (!data.weekStart || !data.weekEnd) return 'Başlangıç ve bitiş tarihi gerekli'
  if (new Date(data.weekEnd) <= new Date(data.weekStart)) return 'Bitiş tarihi başlangıçtan sonra olmalı'
  const validTypes = ['jeton_spend', 'session_count', 'gift_sent', 'fortune_count', 'pk_score', 'viewer_count', 'interaction']
  if (data.type && !validTypes.includes(data.type)) return `Geçersiz tür: ${data.type}`
  const validCategories = ['stream', 'voice', 'general']
  if (data.category && !validCategories.includes(data.category)) return `Geçersiz kategori: ${data.category}`
  return null
}
