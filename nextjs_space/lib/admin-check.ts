import prisma from '@/lib/db'

// Admin ve yönetici rolündeki kullanıcıların jeton işlemleri
// kar/zarar hesabına dahil edilmez ve alıcılara bakiye olarak yansımaz
const EXCLUDED_ROLES = ['admin', 'yonetici']

export async function isExcludedFromFinance(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    return user ? EXCLUDED_ROLES.includes(user.role) : false
  } catch {
    return false
  }
}

export async function getExcludedUserIds(): Promise<string[]> {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: EXCLUDED_ROLES } },
      select: { id: true }
    })
    return users.map((u: any) => u.id)
  } catch {
    return []
  }
}
