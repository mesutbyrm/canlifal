export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * POST /api/auth/logout
 * Mobile logout endpoint. Invalidates the session/token.
 * For mobile JWT tokens, we simply acknowledge — token expiry handles the rest.
 * For web sessions, NextAuth handles /api/auth/signout.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // JWT tokens are stateless — no server-side invalidation needed.
    // Client should discard the token.
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
