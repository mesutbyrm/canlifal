export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { resolveUserAnimations } from '@/lib/animation-resolver'

/**
 * GET /api/animations/resolve?userId=&context=&category=
 * Belirli bir kullanici + baglam + kategori icin tek animasyon cozumler.
 * userId verilmezse oturum sahibinin kendisi kullanilir.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const sp = req.nextUrl.searchParams
    const targetUserId = sp.get('userId') || authUser.id
    const context = sp.get('context')
    const categoryParam = sp.get('category')
    const categories = categoryParam
      ? categoryParam.split(',').map((c) => c.trim()).filter(Boolean)
      : null

    const animations = await resolveUserAnimations(targetUserId, { context, categories })

    if (categories && categories.length === 1) {
      return NextResponse.json({
        userId: targetUserId,
        category: categories[0],
        context: context || null,
        animation: animations[categories[0]] || null,
      })
    }

    return NextResponse.json({ userId: targetUserId, context: context || null, animations })
  } catch (error) {
    console.error('[animations/resolve] error:', error)
    return NextResponse.json({ error: 'Animasyon çözümlenemedi' }, { status: 500 })
  }
}
