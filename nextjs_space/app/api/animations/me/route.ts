export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { resolveUserAnimations } from '@/lib/animation-resolver'

/**
 * GET /api/animations/me
 * Oturum acmis kullanicinin tum kategoriler icin cozumlenmis animasyonlari.
 * Query: ?context=voice_room
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const context = req.nextUrl.searchParams.get('context')
    const animations = await resolveUserAnimations(authUser.id, { context })

    return NextResponse.json({
      userId: authUser.id,
      context: context || null,
      animations,
    })
  } catch (error) {
    console.error('[animations/me] error:', error)
    return NextResponse.json({ error: 'Animasyonlar yüklenemedi' }, { status: 500 })
  }
}
