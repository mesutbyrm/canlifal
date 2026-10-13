export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { checkAndDeductCredits, FORTUNE_COSTS, FortuneType } from '@/lib/credit-checker'

/**
 * POST /api/fortune-access/consume
 * Auth: ZORUNLU
 * Body: { fortuneType: string }
 *
 * Jeton ile fal kilidi tüketimi (opsiyonel yol — normalde fal POST’unda otomatik düşülür).
 * Flutter’ın seçenekli ön-ödeme akışı için.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const fortuneType = (body.fortuneType || '').trim()
    if (!fortuneType || !FORTUNE_COSTS[fortuneType as FortuneType]) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION', message: 'Geçersiz fal türü' } },
        { status: 400 }
      )
    }

    const result = await checkAndDeductCredits(authUser.id, fortuneType as FortuneType)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: result.message } },
        { status: 402 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        consumed: true,
        fortuneType,
        cost: FORTUNE_COSTS[fortuneType as FortuneType],
        newBalance: result.newBalance ?? null,
      },
    })
  } catch (error: any) {
    console.error('[fortune-access] consume error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Tüketim işlemi başarısız' } },
      { status: 500 }
    )
  }
}
