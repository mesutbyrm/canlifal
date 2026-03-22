import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { checkIpFortuneAccess, checkRegisteredFortuneAccess, getClientIp } from '@/lib/fortune-access'
import { FortuneType, FORTUNE_COSTS } from '@/lib/credit-checker'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fortuneType, adWatched } = body

    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      // Unregistered user - IP based
      const ip = getClientIp(request)
      const result = await checkIpFortuneAccess(ip, adWatched === true)
      return NextResponse.json(result)
    }

    // Registered user
    if (!fortuneType || !FORTUNE_COSTS[fortuneType as FortuneType]) {
      return NextResponse.json({ allowed: false, reason: 'error', message: 'Geçersiz fal türü' }, { status: 400 })
    }

    const result = await checkRegisteredFortuneAccess(session.user.id, fortuneType as FortuneType, adWatched === true)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Fortune access check error:', error)
    return NextResponse.json({ allowed: false, reason: 'error', message: 'Bir hata oluştu' }, { status: 500 })
  }
}
