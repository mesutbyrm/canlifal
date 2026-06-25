import { NextRequest, NextResponse } from 'next/server'
import { checkIpFortuneAccess, checkRegisteredFortuneAccess, getClientIp } from '@/lib/fortune-access'
import { FortuneType, FORTUNE_COSTS } from '@/lib/credit-checker'
import { authenticateRequest } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fortuneType, adWatched } = body

    const authUser = await authenticateRequest(request)

    if (!authUser) {
      // Unregistered user - IP based
      const ip = getClientIp(request)
      const result = await checkIpFortuneAccess(ip, adWatched === true)
      return NextResponse.json(result)
    }

    // Registered user
    if (!fortuneType || !FORTUNE_COSTS[fortuneType as FortuneType]) {
      return NextResponse.json({ allowed: false, reason: 'error', message: 'Geçersiz fal türü' }, { status: 400 })
    }

    const result = await checkRegisteredFortuneAccess(authUser.id, fortuneType as FortuneType, adWatched === true)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Fortune access check error:', error)
    return NextResponse.json({ allowed: false, reason: 'error', message: 'Bir hata oluştu' }, { status: 500 })
  }
}
