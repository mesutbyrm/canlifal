import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'
const ACCESS_TOKEN_EXPIRY = '7d'   // 7 gün
const REFRESH_TOKEN_EXPIRY = '30d' // 30 gün

export interface MobileTokenPayload {
  userId: string
  email: string
  role: string
  type: 'access' | 'refresh'
}

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

/**
 * Generate access + refresh tokens for mobile
 */
export function generateMobileTokens(user: { id: string; email: string; role: string }) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, type: 'access' } as MobileTokenPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  )
  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, type: 'refresh' } as MobileTokenPayload,
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  )
  return { accessToken, refreshToken }
}

/**
 * Verify a mobile JWT token
 */
export function verifyMobileToken(token: string): MobileTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as MobileTokenPayload
    return decoded
  } catch {
    return null
  }
}

/**
 * Dual authentication: supports both NextAuth session (web) and Bearer token (mobile)
 * Use this in any API route that should work for both web and mobile.
 * 
 * Usage:
 *   const user = await authenticateRequest(req)
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthenticatedUser | null> {
  // 1) Try Bearer token first (mobile)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    
    // Check auth cache first (avoids DB hit on every request)
    const { getCachedAuth, setCachedAuth } = await import('@/lib/perf')
    const cached = getCachedAuth(token)
    if (cached) return cached
    
    const payload = verifyMobileToken(token)
    if (payload && payload.type === 'access') {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, role: true, image: true },
      })
      if (user) {
        setCachedAuth(token, user)
        return user
      }
    }
    return null // Invalid token
  }

  // 2) Fall back to NextAuth session (web)
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: (session.user as any).email || '',
      name: session.user.name || '',
      role: (session.user as any).role || 'user',
      image: session.user.image,
    }
  }

  return null
}
