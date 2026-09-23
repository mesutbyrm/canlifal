/**
 * Teller Level System
 * 
 * Levels: bronze → silver → gold → diamond
 * 
 * Level Points are calculated from:
 * - Total sessions completed (1 point each)
 * - Average rating (bonus multiplier)
 * - Total earnings (1 point per 100 jeton)
 * - Account age (1 point per week active)
 * 
 * Thresholds:
 * - Bronze: 0+ points
 * - Silver: 100+ points
 * - Gold: 500+ points  
 * - Diamond: 2000+ points
 */

export const TELLER_LEVELS = {
  bronze: { name: 'Bronze', emoji: '🥉', minPoints: 0, color: '#CD7F32', commissionBonus: 0 },
  silver: { name: 'Silver', emoji: '🥈', minPoints: 100, color: '#C0C0C0', commissionBonus: -2 },
  gold: { name: 'Gold', emoji: '🥇', minPoints: 500, color: '#FFD700', commissionBonus: -5 },
  diamond: { name: 'Diamond', emoji: '💎', minPoints: 2000, color: '#B9F2FF', commissionBonus: -10 },
} as const

export type TellerLevel = keyof typeof TELLER_LEVELS

export const LEVEL_ORDER: TellerLevel[] = ['bronze', 'silver', 'gold', 'diamond']

export function calculateLevelPoints(teller: {
  totalSessions: number
  rating: number
  totalEarnings: number
  createdAt: Date | string
}): number {
  const sessionPoints = teller.totalSessions // 1 point per session
  const earningPoints = Math.floor((teller.totalEarnings || 0) / 100) // 1 point per 100 jeton
  
  const createdAt = new Date(teller.createdAt)
  const weeksActive = Math.floor((Date.now() - createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const agePoints = weeksActive // 1 point per week
  
  const ratingMultiplier = teller.rating >= 4.5 ? 1.5 : teller.rating >= 4.0 ? 1.2 : teller.rating >= 3.0 ? 1.0 : 0.8
  
  const basePoints = sessionPoints + earningPoints + agePoints
  return Math.floor(basePoints * ratingMultiplier)
}

export function getLevelForPoints(points: number): TellerLevel {
  if (points >= TELLER_LEVELS.diamond.minPoints) return 'diamond'
  if (points >= TELLER_LEVELS.gold.minPoints) return 'gold'
  if (points >= TELLER_LEVELS.silver.minPoints) return 'silver'
  return 'bronze'
}

export function getNextLevel(current: TellerLevel): TellerLevel | null {
  const idx = LEVEL_ORDER.indexOf(current)
  return idx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[idx + 1] : null
}

export function getProgressToNextLevel(points: number, currentLevel: TellerLevel): number {
  const nextLevel = getNextLevel(currentLevel)
  if (!nextLevel) return 100 // Diamond = max
  const current = TELLER_LEVELS[currentLevel].minPoints
  const next = TELLER_LEVELS[nextLevel].minPoints
  return Math.min(100, Math.floor(((points - current) / (next - current)) * 100))
}

export const LEVEL_LABELS_TR: Record<TellerLevel, string> = {
  bronze: 'Bronz',
  silver: 'Gümüş',
  gold: 'Altın',
  diamond: 'Elmas',
}
