/**
 * lib/rbac.ts — Centralized Role-Based Access Control helpers.
 *
 * Wraps admin-utils role checks with request-level auth resolution,
 * so route handlers can guard with a single call:
 *
 *   const denied = await requireAdmin(request)
 *   if (denied) return denied
 *
 * Returns null when access is granted, or a NextResponse (403/401) when denied.
 * All flags default to "enabled" if unknown (backward compat).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import {
  isAdminRole,
  isFullAdmin,
  ADMIN_ROLES,
  FULL_ADMIN_ROLES,
} from '@/lib/admin-utils'

export { isAdminRole, isFullAdmin, ADMIN_ROLES, FULL_ADMIN_ROLES }

// ─── Types ────────────────────────────────────────────────────────
export type ResolvedUser = {
  id: string
  role: string
  email?: string | null
}

// ─── Resolve authenticated user from request ──────────────────────
/**
 * Dual auth: mobile Bearer JWT first, falls back to web NextAuth session.
 * Returns null if unauthenticated.
 */
export async function resolveUser(req: NextRequest): Promise<ResolvedUser | null> {
  // Mobile JWT
  const mobileUser = await authenticateRequest(req)
  if (mobileUser) {
    return { id: mobileUser.id, role: mobileUser.role ?? 'user', email: mobileUser.email }
  }
  // Web session
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    return {
      id: session.user.id,
      role: (session.user as any).role ?? 'user',
      email: session.user.email,
    }
  }
  return null
}

// ─── Guard helpers (return null = allowed, NextResponse = denied) ─

/** 401 if unauthenticated */
export async function requireAuth(req: NextRequest): Promise<{ user: ResolvedUser } | NextResponse> {
  const user = await resolveUser(req)
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
      { status: 401 }
    )
  }
  return { user }
}

/** 401 if unauthenticated, 403 if not in ADMIN_ROLES */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const result = await requireAuth(req)
  if (result instanceof NextResponse) return result
  if (!isAdminRole(result.user.role)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok' } },
      { status: 403 }
    )
  }
  return null // allowed
}

/** 401 if unauthenticated, 403 if not in FULL_ADMIN_ROLES (admin/yonetici) */
export async function requireFullAdmin(req: NextRequest): Promise<NextResponse | null> {
  const result = await requireAuth(req)
  if (result instanceof NextResponse) return result
  if (!isFullAdmin(result.user.role)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Bu işlem için tam yönetici yetkisi gerekiyor' } },
      { status: 403 }
    )
  }
  return null
}

/** 401 if unauthenticated, 403 if role not in the given list */
export async function requireRole(
  req: NextRequest,
  allowedRoles: string[]
): Promise<NextResponse | null> {
  const result = await requireAuth(req)
  if (result instanceof NextResponse) return result
  if (!allowedRoles.includes(result.user.role)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok' } },
      { status: 403 }
    )
  }
  return null
}

/** Check if the requesting user owns the resource or is admin */
export async function requireOwnerOrAdmin(
  req: NextRequest,
  resourceOwnerId: string
): Promise<NextResponse | null> {
  const result = await requireAuth(req)
  if (result instanceof NextResponse) return result
  if (result.user.id !== resourceOwnerId && !isAdminRole(result.user.role)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Bu kaynağa erişim yetkiniz yok' } },
      { status: 403 }
    )
  }
  return null
}
