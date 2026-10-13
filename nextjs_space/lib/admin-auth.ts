/**
 * lib/admin-auth.ts — Admin uçları için çift kimlik çözümü (web çerezi VEYA mobil Bearer JWT)
 *
 * `resolveUser` / `authenticateRequest` ile oturum çözümü; jeton fiyatlandırma gibi
 * uçlarda granüler yetkiler `hasPermission` ile kontrol edilir.
 */
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import { resolveUser } from '@/lib/rbac'
import { hasPermission } from '@/lib/permissions'

export interface StaffSessionUser {
  id: string
  email: string
  name: string
  image?: string | null
  role: string
}

export interface StaffSession {
  user: StaffSessionUser
  expires?: string
}

/** Tam yönetici rolleri (jeton fiyatlandırma vb. için varsayılan geçiş). */
export const STAFF_FULL_ADMIN_ROLES = ['admin', 'yonetici'] as const

export const FINANCE_CONFIG_PERMISSIONS = ['system.config.manage', 'finance.jeton.adjust'] as const

export type ResolvedStaff = { id: string; role: string }

/**
 * admin / yonetici veya ilgili finans-yapılandırma yetkilerinden biri.
 */
export async function staffCanManageFinanceConfig(staff: ResolvedStaff): Promise<boolean> {
  if ((STAFF_FULL_ADMIN_ROLES as readonly string[]).includes(staff.role)) return true
  for (const key of FINANCE_CONFIG_PERMISSIONS) {
    try {
      if (await hasPermission(staff.role, key, staff.id)) return true
    } catch (e) {
      console.error('[admin-auth] hasPermission failed:', e)
      return false
    }
  }
  return false
}

/**
 * NextAuth oturumu VEYA Bearer JWT'den oturum benzeri nesne üretir.
 * Hiçbiri yoksa `null` döner (çağıran 401 vermeli).
 */
export async function getStaffSession(req?: { headers: Headers } | NextRequest): Promise<StaffSession | null> {
  const session = await getServerSession(authOptions)
  if (session?.user) return session as unknown as StaffSession

  let authHeader: string | null = null
  try {
    authHeader = req?.headers?.get?.('authorization') ?? headers().get('authorization')
  } catch {
    authHeader = null
  }
  if (!authHeader?.startsWith('Bearer ')) return null

  const carrier = { headers: new Headers({ authorization: authHeader }) } as NextRequest
  const mobile = await authenticateRequest(carrier)
  if (!mobile) return null

  return {
    user: {
      id: mobile.id,
      email: mobile.email,
      name: mobile.name,
      image: mobile.image ?? null,
      role: mobile.role,
    },
  }
}

/**
 * Kimlik çözümü: `{ id, role }` veya oturum yoksa `null` (401).
 * Yetki kontrolü yapılmaz — çağıran rota kendi 403 mantığını uygular.
 */
export async function resolveStaff(req?: { headers: Headers } | NextRequest): Promise<ResolvedStaff | null> {
  if (req && typeof (req as NextRequest).nextUrl !== 'undefined') {
    const user = await resolveUser(req as NextRequest)
    return user ? { id: user.id, role: user.role } : null
  }
  const s = await getStaffSession(req)
  if (!s?.user) return null
  return { id: s.user.id, role: s.user.role }
}

/**
 * Oturum + finans yapılandırma yetkisi. Yetkisiz → 401 veya 403 NextResponse.
 */
export async function requireFinanceConfigStaff(
  req: NextRequest
): Promise<{ staff: ResolvedStaff } | NextResponse> {
  const staff = await resolveStaff(req)
  if (!staff) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  if (!(await staffCanManageFinanceConfig(staff))) {
    return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
  }
  return { staff }
}
