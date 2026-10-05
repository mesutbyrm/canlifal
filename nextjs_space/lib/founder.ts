// Site kurucusu (founder) görünümü için ortak yardımcılar.
// Admin ve yönetici hesapları sitenin her yerinde "Site Kurucusu" olarak görünür.

export const FOUNDER_LABEL = 'Site Kurucusu'
export const FOUNDER_LABEL_UPPER = 'SİTE KURUCUSU'
export const FOUNDER_ROLES = ['admin', 'yonetici'] as const

export interface FounderLike {
  role?: string | null
  isFounder?: boolean | null
}

export function isFounderAccount(user?: FounderLike | null): boolean {
  if (!user) return false
  if (user.isFounder) return true
  const role = (user.role || '').toLowerCase()
  return (FOUNDER_ROLES as readonly string[]).includes(role)
}
