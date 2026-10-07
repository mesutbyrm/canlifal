import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * ADMIN-001 — `getServerSession(authOptions)` yalnız web çerezini tanır; mobil
 * uygulama (Bearer JWT) bu uçlardan 401 alıyordu. Bu yardımcı aynı Session
 * şeklini döndürür: önce mobil JWT, yoksa NextAuth oturumu. Rol kontrolleri
 * çağıran route'ta olduğu gibi kalır (yetki genişletilmez).
 */
export type HybridSession = {
  user: {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
    role?: string
  }
}

export async function getHybridSession(
  req?: NextRequest | Request | null
): Promise<HybridSession | null> {
  if (req) {
    const user = await authenticateRequest(req as NextRequest)
    if (user?.id) {
      return {
        user: {
          id: user.id,
          email: user.email ?? null,
          name: user.name ?? null,
          image: (user as any).image ?? null,
          role: (user as any).role ?? 'user',
        },
      }
    }
    return null
  }
  return (await getServerSession(authOptions)) as HybridSession | null
}
